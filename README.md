# LegacyLock 数字遗产密库

LegacyLock 在本机保存加密资产，支持两块 USB 设备共同恢复只读访问。所有者必须同时提供密码和安全密钥，才能修改资产、设置应用、配置恢复设备或导出管理备份。

本次安全修复使用 **LVCF 3** 格式。新格式不兼容旧版密钥；请先保全旧数据，通过明确的迁移入口建立新密库，再重新配置两盘。应用不会自动清空或替换旧数据。

这是经过项目内回归测试的修复版本，不等同于独立密码学审计或安全认证。物理 USB 文件可以复制；掌握两份恢复秘密的人可以读取数据，但不能伪造原所有者签名。不要把两盘、所有者密码及密钥放在同一个位置。

## 安装与开发启动

需要 Node.js 24 LTS、npm。桌面运行时为 Electron 44.4.3；安装依赖需要联网，日常密库使用不依赖网络服务。

```sh
npm ci
npm test
npm run build
npm run electron
```

Windows 也可在完成 `npm ci` 后使用 `启动LegacyLock.ps1` 或 `.bat`。启动脚本构建失败即停止。桌面应用仅加载打包静态文件，不自动连接或复用 5173 开发服务器。浏览器预览不提供密库能力。

```sh
npm run test:desktop
npm run dist:win
# 在 Linux 上：npm run dist:linux
# 在 macOS 上：npm run build && npx electron-builder --mac zip
```

安装包不再依赖 Rust 可执行文件，也不从 PATH 查找密码工具。CI 包含 Windows、Linux、macOS 构建及测试；CI 配置存在不代表已在本机完成三平台实机认证。发布前仍需要真实两盘拔插/断电测试和发行签名。

## 文档

2026-09-21 已恢复原有侧栏、资产卡片、分类选择、五套背景和订阅测试页面，继续使用 LVCF 3 安全核心。订阅为明确标注的本地测试体验，不扣费。详见[界面恢复说明](audit/2026-09-21/界面恢复说明.md)。

- [所有者手册](USER_MANUAL.md)：初始化、保存、凭据、两盘配置和备份。
- [继承人手册](HEIR_MANUAL.md)：本机与异机只读恢复、离线阅读器。
- [权限对照](OWNER_VS_HEIR_PERMISSIONS.md)：后端实际授权边界。
- [开发与恢复文档](DEVELOPMENT.md)：架构、测试、旧数据迁移、故障处理。
- [LVCF 3 协议](LVCF3_PROTOCOL.md)：文件结构与密码学约定。
- [原审计报告](audit/2026-09-20/项目审计报告.md)与[修复说明](audit/2026-09-20/修复说明.md)。

两份 `military-grade-digital-heritage-vault-LegacyLock*.md` 为历史设计材料；其中的实现承诺和旧协议不能作为本版本操作说明。
