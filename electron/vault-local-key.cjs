"use strict";
const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const core = require("./vault-core.cjs");
const { read, atomicWrite } = require("./vault-store.cjs");
const binding = (envelope) =>
  crypto
    .createHash("sha256")
    .update(
      core.canonical([envelope.id, envelope.signingPublicKey, envelope.owner]),
    )
    .digest("hex");
// This file is local to the OS account and is never part of an information backup.
class LocalKey {
  constructor(store, file, safeStorage, platform = process.platform) {
    Object.assign(this, { store, file, safeStorage, platform });
  }
  available() {
    try {
      return (
        this.safeStorage.isEncryptionAvailable() &&
        (this.platform !== "linux" ||
          ["gnome_libsecret", "kwallet", "kwallet5", "kwallet6"].includes(
            this.safeStorage.getSelectedStorageBackend(),
          ))
      );
    } catch {
      return false;
    }
  }
  async record(envelope) {
    try {
      const record = await read(this.file);
      if (
        record.version !== 1 ||
        record.binding !== binding(envelope) ||
        typeof record.cipher !== "string" ||
        record.cipher.length > 16384
      )
        return null;
      return record;
    } catch {
      return null;
    }
  }
  async status() {
    const available = this.available();
    try {
      const envelope = core.validateEnvelope(await read(this.store.file));
      return {
        available,
        remembered: !!(await this.record(envelope)),
      };
    } catch {
      return { available, remembered: false };
    }
  }
  async clear() {
    await fs.unlink(this.file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
  async invalidateFor(envelope) {
    if (!(await this.record(envelope))) await this.clear();
  }
  set(enabled, password, secret) {
    return this.store.serial(async () => {
      core.owner(this.store.session);
      if (typeof enabled !== "boolean") core.fail("INVALID_SETTINGS");
      if (!enabled) {
        await this.clear();
        return;
      }
      if (!this.available()) core.fail("LOCAL_KEY_UNAVAILABLE");
      const epoch = this.store.epoch;
      await this.store.verifyCredentials(password, secret);
      if (epoch !== this.store.epoch) core.fail("LOCKED");
      const envelope = core.validateEnvelope(
        await read(this.store.file),
        this.store.session.envelope,
      );
      if (
        core.canonical(envelope) !== core.canonical(this.store.session.envelope)
      )
        core.fail("LOCAL_VAULT_CHANGED");
      if (epoch !== this.store.epoch) core.fail("LOCKED");
      const value = {
        version: 1,
        binding: binding(envelope),
        cipher: this.safeStorage
          .encryptString(JSON.stringify({ binding: binding(envelope), secret }))
          .toString("base64"),
      };
      const verify = (record) => {
        if (core.canonical(record) !== core.canonical(value))
          core.fail("WRITE_VERIFICATION_FAILED");
        const opened = JSON.parse(
          this.safeStorage.decryptString(Buffer.from(record.cipher, "base64")),
        );
        if (opened.secret !== secret || opened.binding !== value.binding)
          core.fail("WRITE_VERIFICATION_FAILED");
      };
      try {
        await atomicWrite(this.file, value, { backup: false, verify });
        if (epoch !== this.store.epoch) core.fail("LOCKED");
      } catch (e) {
        await this.clear();
        throw e;
      }
    });
  }
  unlock(password) {
    return this.store.serial(async () => {
      // Never use a remembered local credential to take over an external heir session.
      if (this.store.session) core.fail("OWNER_REQUIRED");
      if (!this.available()) core.fail("LOCAL_KEY_UNAVAILABLE");
      const epoch = this.store.epoch;
      const envelope = core.validateEnvelope(await read(this.store.file));
      const record = await this.record(envelope);
      if (!record) core.fail("LOCAL_KEY_UNAVAILABLE");
      let decoded;
      try {
        decoded = JSON.parse(
          this.safeStorage.decryptString(Buffer.from(record.cipher, "base64")),
        );
        if (decoded.binding !== binding(envelope))
          throw Error("Binding mismatch");
      } catch {
        core.fail("LOCAL_KEY_UNAVAILABLE");
      }
      let next;
      try {
        next = await core.unlockOwner(envelope, password, decoded.secret);
      } finally {
        decoded.secret = null;
      }
      if (epoch !== this.store.epoch) {
        core.destroySession(next);
        core.fail("LOCKED");
      }
      this.store.lock();
      this.store.session = next;
      this.store.lastActivity = Date.now();
      return { view: this.store.view() };
    });
  }
}
module.exports = { LocalKey };
