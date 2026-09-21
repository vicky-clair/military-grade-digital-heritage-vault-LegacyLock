"use strict";
// LVCF 3: a single, versioned implementation shared by desktop and offline reader.
const c = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(c.scrypt);
const MAX_BYTES = 32 * 1024 * 1024;
const CATEGORIES = new Set([
  "login",
  "note",
  "card",
  "identity",
  "password",
  "document",
  "sshKey",
  "apiCredential",
  "membership",
  "cryptoWallet",
  "medical",
  "reward",
  "outdoorLicense",
  "passport",
  "database",
  "router",
  "server",
  "email",
  "ssn",
  "softwareLicense",
  "bankAccount",
  "driverLicense",
  "game",
  "license",
]);
class VaultError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function fail(code) {
  throw new VaultError(code);
}
function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
function json(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > MAX_BYTES)
    fail("INVALID_SIZE");
  try {
    return JSON.parse(text);
  } catch {
    fail("INVALID_FORMAT");
  }
}
function object(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function str(v, max = 100000) {
  return typeof v === "string" && v.length <= max;
}
function b64(v, size) {
  if (!str(v, MAX_BYTES) || !/^[A-Za-z0-9+/]*={0,2}$/.test(v))
    fail("INVALID_FORMAT");
  const b = Buffer.from(v, "base64");
  if (b.toString("base64") !== v || (size !== undefined && b.length !== size))
    fail("INVALID_FORMAT");
  return b;
}
function secretText(v) {
  if (!str(v, 200)) fail("INVALID_CREDENTIALS");
  const clean = v.replace(/^LL3-/i, "").replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) fail("INVALID_CREDENTIALS");
  return clean;
}
function newSecret() {
  return (
    "LL3-" +
    c.randomBytes(32).toString("hex").match(/.{8}/g).join("-").toUpperCase()
  );
}
async function credentialKey(password, secret, salt) {
  if (!str(password, 1024) || password.length < 12) fail("INVALID_CREDENTIALS");
  const material = Buffer.from(JSON.stringify([password, secretText(secret)]));
  try {
    return await scrypt(material, salt, 32, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
  } finally {
    material.fill(0);
  }
}
function encrypt(key, data, aad) {
  const iv = c.randomBytes(12),
    cipher = c.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(canonical(data));
  try {
    const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: encrypted.toString("base64"),
    };
  } finally {
    if (!Buffer.isBuffer(data)) bytes.fill(0);
  }
}
function boxCheck(box) {
  if (!object(box) || Object.keys(box).sort().join(",") !== "data,iv,tag")
    fail("INVALID_FORMAT");
  b64(box.iv, 12);
  b64(box.tag, 16);
  b64(box.data);
}
function decrypt(key, box, aad) {
  boxCheck(box);
  try {
    const d = c.createDecipheriv("aes-256-gcm", key, b64(box.iv, 12));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(b64(box.tag, 16));
    return Buffer.concat([d.update(b64(box.data)), d.final()]);
  } catch {
    fail("AUTHENTICATION_FAILED");
  }
}
function unpack(key, box, aad) {
  const buf = decrypt(key, box, aad);
  try {
    return json(buf.toString("utf8"));
  } finally {
    buf.fill(0);
  }
}
function rootKey(v) {
  try {
    const k = c.createPublicKey({ key: b64(v), format: "der", type: "spki" });
    if (k.asymmetricKeyType !== "ed25519") fail("INVALID_FORMAT");
    return k;
  } catch {
    fail("INVALID_FORMAT");
  }
}
function unsigned(v) {
  const { signature, ...rest } = v;
  return rest;
}
function sign(v, key) {
  const body = unsigned(v);
  return {
    ...body,
    signature: c
      .sign(null, Buffer.from(canonical(body)), key)
      .toString("base64"),
  };
}
function validateEnvelope(v, pin) {
  if (
    !object(v) ||
    v.magic !== "LEGACYLOCK" ||
    v.format !== 3 ||
    !str(v.id, 64) ||
    !/^[a-f0-9-]{36}$/.test(v.id) ||
    !Number.isSafeInteger(v.revision) ||
    v.revision < 1
  )
    fail("UNSUPPORTED_FORMAT");
  if (
    Object.keys(v).sort().join(",") !==
    "format,id,magic,owner,payload,recovery,revision,signature,signingPublicKey"
  )
    fail("INVALID_FORMAT");
  if (pin && (v.id !== pin.id || v.signingPublicKey !== pin.signingPublicKey))
    fail("WRONG_VAULT");
  if (
    !object(v.owner) ||
    v.owner.kdf !== "scrypt-32768-8-1" ||
    Object.keys(v.owner).sort().join(",") !== "kdf,salt,wrapped"
  )
    fail("INVALID_FORMAT");
  b64(v.owner.salt, 16);
  boxCheck(v.owner.wrapped);
  boxCheck(v.payload);
  if (v.recovery !== null) {
    if (
      !object(v.recovery) ||
      Object.keys(v.recovery).sort().join(",") !== "generation,wrapped" ||
      !Number.isSafeInteger(v.recovery.generation) ||
      v.recovery.generation < 1
    )
      fail("INVALID_FORMAT");
    boxCheck(v.recovery.wrapped);
  }
  if (
    !c.verify(
      null,
      Buffer.from(canonical(unsigned(v))),
      rootKey(v.signingPublicKey),
      b64(v.signature, 64),
    )
  )
    fail("INVALID_SIGNATURE");
  return v;
}
function validateItems(items) {
  if (!Array.isArray(items) || items.length > 10000) fail("INVALID_ITEMS");
  const ids = new Set();
  for (const i of items) {
    if (
      !object(i) ||
      !str(i.id, 128) ||
      !i.id ||
      ids.has(i.id) ||
      !str(i.title, 1024) ||
      !i.title.trim() ||
      !CATEGORIES.has(i.category)
    )
      fail("INVALID_ITEMS");
    ids.add(i.id);
    const allowed = new Set([
      "id",
      "title",
      "category",
      "username",
      "password",
      "url",
      "notes",
      "customFields",
      "attachments",
      "inheritanceInstructions",
      "revision",
      "createdAt",
      "updatedAt",
    ]);
    if (Object.keys(i).some((k) => !allowed.has(k))) fail("INVALID_ITEMS");
    for (const k of [
      "username",
      "password",
      "url",
      "notes",
      "inheritanceInstructions",
    ])
      if (i[k] !== undefined && !str(i[k])) fail("INVALID_ITEMS");
    for (const k of ["createdAt", "updatedAt"])
      if (!Number.isSafeInteger(i[k]) || i[k] < 0) fail("INVALID_ITEMS");
    if (
      i.revision !== undefined &&
      (!Number.isSafeInteger(i.revision) || i.revision < 0)
    )
      fail("INVALID_ITEMS");
    if (i.customFields !== undefined) {
      if (!Array.isArray(i.customFields) || i.customFields.length > 100)
        fail("INVALID_ITEMS");
      for (const f of i.customFields)
        if (
          !object(f) ||
          !str(f.id, 128) ||
          !str(f.name, 1024) ||
          !str(f.value) ||
          typeof f.isSecret !== "boolean" ||
          (f.type !== undefined && !str(f.type, 40))
        )
          fail("INVALID_ITEMS");
    }
    if (i.attachments !== undefined) {
      if (!Array.isArray(i.attachments) || i.attachments.length > 100)
        fail("INVALID_ITEMS");
      for (const a of i.attachments) {
        if (
          !object(a) ||
          !str(a.id, 128) ||
          !str(a.name, 255) ||
          !str(a.type, 255) ||
          !Number.isSafeInteger(a.size) ||
          a.size < 0 ||
          a.size > 2 * 1024 * 1024 ||
          !str(a.data, 3 * 1024 * 1024)
        )
          fail("INVALID_ITEMS");
        const m = /^data:[^,]*;base64,([A-Za-z0-9+/]*={0,2})$/.exec(a.data);
        if (!m || b64(m[1]).length !== a.size) fail("INVALID_ITEMS");
      }
    }
  }
  if (Buffer.byteLength(canonical(items)) > 20 * 1024 * 1024)
    fail("INVALID_SIZE");
  return items;
}
function validateSettings(s) {
  if (
    !object(s) ||
    Object.keys(s).sort().join(",") !== "autoLockMinutes,heirName,heirNotes"
  )
    fail("INVALID_SETTINGS");
  if (
    ![1, 5, 15, 30, 60].includes(s.autoLockMinutes) ||
    !str(s.heirName, 200) ||
    !str(s.heirNotes, 10000)
  )
    fail("INVALID_SETTINGS");
  return s;
}
function validateData(d) {
  if (!object(d) || Object.keys(d).sort().join(",") !== "items,settings")
    fail("INVALID_FORMAT");
  validateItems(d.items);
  validateSettings(d.settings);
  return d;
}
function aad(v, kind) {
  return canonical(["LVCF3", v.id, v.signingPublicKey, kind]);
}
function owner(session) {
  if (!session || session.role !== "OWNER" || !session.signingKey)
    fail("OWNER_REQUIRED");
}
function dataOf(v, vmk) {
  return validateData(unpack(vmk, v.payload, aad(v, "payload")));
}
async function wrapOwner(v, vmk, signingKey, password, secret) {
  const salt = c.randomBytes(16),
    key = await credentialKey(password, secret, salt);
  const privateBytes = signingKey.export({ format: "der", type: "pkcs8" });
  try {
    return {
      kdf: "scrypt-32768-8-1",
      salt: salt.toString("base64"),
      wrapped: encrypt(
        key,
        {
          vmk: vmk.toString("base64"),
          signingPrivateKey: privateBytes.toString("base64"),
        },
        aad(v, "owner"),
      ),
    };
  } finally {
    key.fill(0);
    privateBytes.fill(0);
  }
}
async function create(password, secret, initial = []) {
  validateItems(initial);
  const keys = c.generateKeyPairSync("ed25519"),
    vmk = c.randomBytes(32);
  const v = {
    magic: "LEGACYLOCK",
    format: 3,
    id: c.randomUUID(),
    revision: 1,
    signingPublicKey: keys.publicKey
      .export({ format: "der", type: "spki" })
      .toString("base64"),
    owner: null,
    recovery: null,
    payload: null,
  };
  try {
    v.owner = await wrapOwner(v, vmk, keys.privateKey, password, secret);
    const data = {
      items: initial,
      settings: { autoLockMinutes: 15, heirName: "", heirNotes: "" },
    };
    v.payload = encrypt(vmk, data, aad(v, "payload"));
    return {
      envelope: sign(v, keys.privateKey),
      vmk,
      signingKey: keys.privateKey,
      role: "OWNER",
      data,
    };
  } catch (e) {
    vmk.fill(0);
    throw e;
  }
}
async function unlockOwner(envelope, password, secret, pin) {
  const v = validateEnvelope(envelope, pin),
    key = await credentialKey(password, secret, b64(v.owner.salt, 16));
  let vmk;
  try {
    const decoded = unpack(key, v.owner.wrapped, aad(v, "owner"));
    vmk = b64(decoded.vmk, 32);
    const priv = b64(decoded.signingPrivateKey);
    let signingKey;
    try {
      signingKey = c.createPrivateKey({
        key: priv,
        format: "der",
        type: "pkcs8",
      });
    } finally {
      priv.fill(0);
    }
    if (
      c
        .createPublicKey(signingKey)
        .export({ format: "der", type: "spki" })
        .toString("base64") !== v.signingPublicKey
    )
      fail("AUTHENTICATION_FAILED");
    return {
      envelope: v,
      vmk,
      signingKey,
      role: "OWNER",
      data: dataOf(v, vmk),
    };
  } catch (e) {
    vmk?.fill(0);
    throw e;
  } finally {
    key.fill(0);
  }
}
function update(session, data) {
  owner(session);
  validateData(data);
  const v = {
    ...session.envelope,
    revision: session.envelope.revision + 1,
    payload: encrypt(session.vmk, data, aad(session.envelope, "payload")),
  };
  return { ...session, envelope: sign(v, session.signingKey), data };
}
function recoveryKey(a, b, id, generation) {
  const seed = Buffer.concat([a, b]);
  try {
    return Buffer.from(
      c.hkdfSync(
        "sha256",
        seed,
        Buffer.from(id),
        Buffer.from("LVCF3 recovery " + generation),
        32,
      ),
    );
  } finally {
    seed.fill(0);
  }
}
function provision(session) {
  owner(session);
  const a = c.randomBytes(32),
    b = c.randomBytes(32),
    generation = (session.envelope.recovery?.generation || 0) + 1;
  const v = { ...session.envelope, revision: session.envelope.revision + 1 },
    key = recoveryKey(a, b, v.id, generation);
  try {
    v.recovery = {
      generation,
      wrapped: encrypt(key, session.vmk, aad(v, "recovery:" + generation)),
    };
    const share = (role, secret) =>
      sign(
        {
          magic: "LEGACYLOCK_SHARE",
          format: 3,
          id: v.id,
          signingPublicKey: v.signingPublicKey,
          generation,
          role,
          secret: secret.toString("base64"),
        },
        session.signingKey,
      );
    return {
      session: { ...session, envelope: sign(v, session.signingKey) },
      primary: share("PRIMARY", a),
      secondary: share("SECONDARY", b),
    };
  } finally {
    a.fill(0);
    b.fill(0);
    key.fill(0);
  }
}
function verifyShare(s, v, role) {
  if (
    !object(s) ||
    Object.keys(s).sort().join(",") !==
      "format,generation,id,magic,role,secret,signature,signingPublicKey" ||
    s.magic !== "LEGACYLOCK_SHARE" ||
    s.format !== 3 ||
    s.role !== role ||
    s.id !== v.id ||
    s.signingPublicKey !== v.signingPublicKey ||
    s.generation !== v.recovery?.generation
  )
    fail("WRONG_RECOVERY_KEYS");
  if (
    !c.verify(
      null,
      Buffer.from(canonical(unsigned(s))),
      rootKey(v.signingPublicKey),
      b64(s.signature, 64),
    )
  )
    fail("INVALID_SIGNATURE");
  return b64(s.secret, 32);
}
function unlockRecovery(envelope, primary, secondary) {
  const v = validateEnvelope(envelope);
  if (!v.recovery) fail("NO_RECOVERY");
  let vmk, a, b, key;
  try {
    a = verifyShare(primary, v, "PRIMARY");
    b = verifyShare(secondary, v, "SECONDARY");
    key = recoveryKey(a, b, v.id, v.recovery.generation);
    vmk = decrypt(
      key,
      v.recovery.wrapped,
      aad(v, "recovery:" + v.recovery.generation),
    );
    if (vmk.length !== 32) fail("INVALID_FORMAT");
    return {
      envelope: v,
      vmk,
      signingKey: null,
      role: "HEIR",
      data: dataOf(v, vmk),
    };
  } catch (e) {
    vmk?.fill(0);
    throw e;
  } finally {
    a?.fill(0);
    b?.fill(0);
    key?.fill(0);
  }
}
async function rewrap(session, password, secret) {
  owner(session);
  const v = { ...session.envelope, revision: session.envelope.revision + 1 };
  v.owner = await wrapOwner(
    v,
    session.vmk,
    session.signingKey,
    password,
    secret,
  );
  return { ...session, envelope: sign(v, session.signingKey) };
}
// Rotate the data key as well as the shares: old recovery material must not open future payloads.
async function rotateRecovery(session, password, secret) {
  owner(session);
  const checked = await unlockOwner(session.envelope, password, secret);
  destroySession(checked);
  const vmk = c.randomBytes(32),
    v = { ...session.envelope };
  try {
    v.owner = await wrapOwner(v, vmk, session.signingKey, password, secret);
    v.payload = encrypt(vmk, session.data, aad(v, "payload"));
    return provision({ ...session, vmk, envelope: v });
  } catch (e) {
    vmk.fill(0);
    throw e;
  }
}
function destroySession(s) {
  if (s) {
    s.vmk?.fill(0);
    s.signingKey = null;
    s.data = null;
    s.role = "LOCKED";
  }
}
module.exports = {
  MAX_BYTES,
  VaultError,
  fail,
  canonical,
  json,
  newSecret,
  validateItems,
  validateSettings,
  verifyShare,
  validateEnvelope,
  create,
  unlockOwner,
  unlockRecovery,
  update,
  provision,
  rewrap,
  rotateRecovery,
  destroySession,
  owner,
};
