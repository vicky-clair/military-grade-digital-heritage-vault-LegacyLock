"use strict";
const core = require("./vault-core.cjs");
const { read, atomicWrite } = require("./vault-store.cjs");
const media = require("./vault-media.cjs");
// UI-independent orchestration; adapters allow device and I/O fault regression tests.
class VaultController {
  constructor(store, dialogs, devices = media) {
    this.store = store;
    this.dialogs = dialogs;
    this.devices = devices;
    this.recoveryPair = null;
  }
  guard(epoch) {
    if (this.store.epoch !== epoch) core.fail("LOCKED");
  }
  lock() {
    this.recoveryPair = null;
    this.store.lock();
  }
  async scan() {
    return (await this.devices.scan()).map(
      ({ token, label, root, size, free }) => ({
        token,
        label,
        root,
        size,
        free,
      }),
    );
  }
  async pair(a, b) {
    return this.devices.pair(await this.devices.scan(), a, b);
  }
  async shares(envelope, pair) {
    const paths = await Promise.all(
      pair.map((d, i) =>
        this.devices.location(d, envelope, i ? "SECONDARY" : "PRIMARY"),
      ),
    );
    return {
      paths,
      primary: await read(paths[0].key),
      secondary: await read(paths[1].key),
    };
  }
  provision(a, b, password, secret) {
    return this.store.serial(async () => {
      core.owner(this.store.session);
      const epoch = this.store.epoch;
      const pair = await this.pair(a, b);
      this.guard(epoch);
      const result = await core.rotateRecovery(
        this.store.session,
        password,
        secret,
      );
      let committed = false;
      try {
        this.guard(epoch);
        const paths = await Promise.all(
          pair.map((d, i) =>
            this.devices.location(
              d,
              result.session.envelope,
              i ? "SECONDARY" : "PRIMARY",
            ),
          ),
        );
        const verify = () => {
          const opened = core.unlockRecovery(
            result.session.envelope,
            result.primary,
            result.secondary,
          );
          core.destroySession(opened);
        };
        verify();
        // Generation directories preserve the previous working pair on partial failure.
        await atomicWrite(paths[0].key, result.primary, {
          backup: false,
          verify,
        });
        this.guard(epoch);
        await atomicWrite(paths[1].key, result.secondary, {
          backup: false,
          verify,
        });
        this.guard(epoch);
        for (const p of paths) {
          await atomicWrite(p.vault, result.session.envelope, {
            backup: false,
          });
          this.guard(epoch);
        }
        await this.pair(a, b);
        this.guard(epoch);
        const saved = await this.shares(result.session.envelope, pair),
          checked = core.unlockRecovery(
            result.session.envelope,
            saved.primary,
            saved.secondary,
          );
        core.destroySession(checked);
        const old = this.store.session;
        const view = await this.store.commit(result.session);
        committed = true;
        core.destroySession(old);
        return { view, paths: paths.map((p) => p.vault) };
      } finally {
        if (!committed) core.destroySession(result.session);
      }
    });
  }
  sync(a, b) {
    return this.store.serial(async () => {
      core.owner(this.store.session);
      const epoch = this.store.epoch,
        envelope = this.store.session.envelope;
      const pair = await this.pair(a, b),
        saved = await this.shares(envelope, pair);
      this.guard(epoch);
      const checked = core.unlockRecovery(
        envelope,
        saved.primary,
        saved.secondary,
      );
      core.destroySession(checked);
      for (const p of saved.paths) {
        this.guard(epoch);
        await atomicWrite(p.vault, envelope);
      }
      await this.pair(a, b);
      this.guard(epoch);
      return {
        revision: envelope.revision,
        paths: saved.paths.map((p) => p.vault),
      };
    });
  }
  async recover(a, b, external = false) {
    const epoch = this.store.epoch;
    const file = external
      ? await this.dialogs.open("选择 LVCF 3 密库备份")
      : this.store.file;
    if (!file) return { canceled: true };
    this.guard(epoch);
    return this.store.serial(async () => {
      this.guard(epoch);
      const envelope = core.validateEnvelope(await read(file));
      await this.store.assertNotRollback(envelope);
      const pair = await this.pair(a, b),
        saved = await this.shares(envelope, pair);
      this.guard(epoch);
      const next = core.unlockRecovery(
        envelope,
        saved.primary,
        saved.secondary,
      );
      try {
        await this.pair(a, b);
        this.guard(epoch);
        this.lock();
        const view = external
          ? await this.store.commit(next)
          : ((this.store.session = next), this.store.view());
        this.recoveryPair = [a, b];
        this.store.lastActivity = Date.now();
        return { view };
      } catch (e) {
        core.destroySession(next);
        throw e;
      }
    });
  }
  async importOwner(password, secret) {
    const epoch = this.store.epoch,
      file = await this.dialogs.open("选择 LVCF 3 密库备份");
    if (!file) return { canceled: true };
    this.guard(epoch);
    const view = await this.store.importOwner(file, password, secret);
    this.recoveryPair = null;
    return { view };
  }
  export(password, secret) {
    return this.store.serial(async () => {
      const epoch = this.store.epoch;
      await this.store.verifyCredentials(password, secret);
      this.guard(epoch);
      const file = await this.dialogs.save(
        "导出加密备份",
        "LegacyLock.llvault",
      );
      if (!file) return { canceled: true };
      this.guard(epoch);
      await atomicWrite(file, this.store.session.envelope);
      this.guard(epoch);
      return { path: file, revision: this.store.session.envelope.revision };
    });
  }
  credentials(password, secret, newPassword, newSecret) {
    return this.store.serial(async () => {
      const epoch = this.store.epoch;
      await this.store.verifyCredentials(password, secret);
      this.guard(epoch);
      const next = await core.rewrap(
        this.store.session,
        newPassword,
        newSecret,
      );
      this.guard(epoch);
      return { view: await this.store.commit(next) };
    });
  }
  health() {
    return this.store.serial(async () => {
      if (!this.store.session) core.fail("LOCKED");
      const epoch = this.store.epoch,
        pin = this.store.session.envelope;
      const disk = core.validateEnvelope(await read(this.store.file), pin);
      this.guard(epoch);
      if (core.canonical(disk) !== core.canonical(pin))
        core.fail("LOCAL_VAULT_CHANGED");
      return {
        revision: disk.revision,
        signatureValid: true,
        authenticatedData: true,
        recovery: !!disk.recovery,
      };
    });
  }
  async checkDevices() {
    if (this.store.session?.role === "HEIR" && this.recoveryPair) {
      const epoch = this.store.epoch;
      try {
        await this.pair(...this.recoveryPair);
      } catch {
        if (this.store.epoch !== epoch || this.store.session?.role !== "HEIR")
          return true;
        this.lock();
        return false;
      }
    }
    return true;
  }
}
module.exports = { VaultController };
