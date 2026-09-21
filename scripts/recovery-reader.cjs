#!/usr/bin/env node
"use strict";
// Standalone, dependency-free read-only recovery. No expiry, app install, or activation.
const core = require("../electron/vault-core.cjs");
const { read } = require("../electron/vault-store.cjs");
const fs = require("node:fs/promises");
async function run(args) {
  if (args.length !== 4)
    throw new Error(
      "用法: node scripts/recovery-reader.cjs <vault.llvault> <primary.llkey> <secondary.llkey> <新输出.json>",
    );
  const [vault, a, b, output] = args;
  const session = core.unlockRecovery(
    await read(vault),
    await read(a),
    await read(b),
  );
  let handle;
  try {
    handle = await fs.open(output, "wx", 0o600);
    await handle.writeFile(
      core.canonical({
        id: session.envelope.id,
        revision: session.envelope.revision,
        ...session.data,
      }),
    );
    await handle.sync();
  } finally {
    await handle?.close();
    core.destroySession(session);
  }
  process.stdout.write(
    "已验证签名并恢复全部数据（含附件）。输出为明文，请妥善保管。原密库未修改。\n",
  );
}
if (require.main === module)
  run(process.argv.slice(2)).catch((e) => {
    process.stderr.write((e.code || e.message) + "\n");
    process.exitCode = 1;
  });
module.exports = { run };
