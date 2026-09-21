# 历史 Rust v1 只读恢复工具

本目录不是当前应用的密码学核心，不会打入安装包。历史 X25519 共享密钥方案存在单私钥可解密问题，无法追溯修复已经导出的文件。

新密库只由 `electron/vault-core.cjs` 创建。此 CLI 仅保留 `unlock` 抢救旧数据，不再生成密钥或加密新容器。旧日期不阻止读取；异常 nonce/超限文件返回错误，输出必须是不存在的新文件。

```sh
cargo test --locked --offline
cargo build --release --locked --offline
target/release/vault-cli unlock --user-key user-key.bin --heir-key heir-key.bin --config config.bin --vault vault.locked --output recovered-new.json
```

输出为明文，不包含可信所有者签名证明。请保全原件，人工核对并按主项目迁移文档处理。
