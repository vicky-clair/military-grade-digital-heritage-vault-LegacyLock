# 开发、迁移与故障恢复 · LVCF 3

## 当前架构

- `electron/vault-core.cjs`：唯一的新协议实现；固定参数 scrypt、AES-256-GCM、Ed25519 签名、两份独立恢复秘密、结构及容量验证。
- `electron/vault-store.cjs`：串行写入、同目录临时文件、fsync、原子替换、上一版本保留、读回验证；所有者/只读/锁定会话和锁定代次。
- `electron/vault-controller.cjs`：设备配置、异机恢复、导出、凭据轮换；设备与对话框适配器支持故障测试。
- `electron/vault-media.cjs`：主进程枚举真实 USB 设备，同一物理盘不能担任两个角色，不使用渲染进程提供的路径或指纹。
- `electron/main.cjs` / `preload.cjs`：沙箱、上下文隔离、主 frame 来源校验、固定 IPC 方法、外部请求及导航阻断、系统锁屏和休眠响应。
- `src/services/vaultClient.ts`：类型化固定 IPC 调用与三语言错误提示，不读取旧浏览器存储。
- `electron/vault-preferences.cjs` / `vault-tray.cjs`：本机外观、语言、托盘、演示偏好与可注入测试的托盘生命周期。持久偏好修改必须是所有者；临时显示语言不持久化。
- `electron/ui-messages.json` / `src/services/messages.ts`：新增流程与原生对话框的中英日文案；原有类别等字典仍在 `src/services/i18n/`。用户内容不参与翻译。
- `src/App.tsx`：当前界面入口；复用资产编辑器、类别和翻译资源。旧版 UI 组件、cryptoService 是未被新入口引用的历史源码，不能重新接回产品。
- `scripts/recovery-reader.cjs`：使用相同协议代码的独立只读恢复脚本。

桌面不再调用 Rust、启动 HTTP 服务、通过 PATH 发现密码工具，或使用浏览器 localStorage/IndexedDB 保存新密库与密钥。关闭窗口会锁定并等待当前写入队列结束。已经完成替换但无法确认读回的异常会强制锁定，避免继续基于旧内存覆盖磁盘。

## 安装和测试

使用 Node.js 24：`npm ci`、`npm test`、`npm run build`、`npm run test:desktop`。桌面测试使用独立临时用户目录、合成资产和模拟设备文件夹；不接触真实用户密库或 USB。测试截图放在审计目录 `fixed-ui/`。Linux 桌面测试需要显示服务，例如 `xvfb-run --auto-servernum node tests/run-desktop.cjs`。

`npm run electron` 只加载 `dist`，因此改动界面后应先构建。浏览器 `npm run dev` 不提供密库功能；仅开发 HTML 允许本机 HMR，生产构建仍严格禁止脚本内联及网络连接。Vite 构建会拒绝旧 cryptoService 和模拟数据进入发布包，监听也排除 Rust target 等生成目录。依赖下载发生在开发/打包阶段；运行时阻止渲染器网络请求，并不等同于操作系统级网络隔离。

真实 USB 型号、写保护、磁盘满、突然断电、拔盘延迟、跨平台安装以及发行签名仍需实机验收。自动化设备适配器测试不能代替这些验证。文件 fsync/rename 的保证也取决于文件系统、驱动和设备缓存，应用无法保证故障硬件绝不丢数据。

## 数据位置

新密库为 Electron `app.getPath('userData')` 下的 `vault-v3.llvault`；上一份已保存的加密快照为 `.previous` 后缀。常见默认位置为 Windows `%APPDATA%/legacylock`、Linux `~/.config/legacylock`、macOS `~/Library/Application Support/legacylock`；以实际应用的 userData 目录为准。

主盘副本位于 `LegacyLock/<id>/<generation>/vault.llvault`。主、副秘密文件分别为 `primary.llkey` / `secondary.llkey`；新配置副盘不写信息备份。日常更新只验证主份额并写主盘。备份与本机使用同一格式，没有通过公开 header 派生的恢复通道。双盘只读导入不落盘，所有者接管写入才执行本机身份和回滚检查。

## 旧版迁移

2026-09-21 起，应用移除了旧版迁移 UI、IPC 和旧浏览器存储读取，统一为密码＋安全密钥、双 USB 两种认证方式。以下保留的是 `vault-migrate.cjs` 的维护者离线恢复说明，并非当前产品入口；不得重新接入缺少双凭据的解锁流程。

1. **旧加密导出包**：选择 `LEGACYLOCK_ENCRYPTED_CONTAINER` v2 包，提供原导出密码及原密钥（包未启用密钥时可留空）。迁移只使用原密码认证加密通道，不使用公开参数恢复后门。固定验证算法标识、nonce、salt、大小及 KDF 迭代上限。
2. **同一安装的旧本机数据**：主动读取旧 IndexedDB / localStorage。必须有完整的密码哈希、盐和密钥哈希，并核验输入。缺失认证元数据时拒绝将其视为自动认证成功；保留数据并使用已知凭据的加密导出包。旧数据库读取失败不会伪装成空数据。
3. 设置新的至少 12 位密码和新 LL3 密钥。迁移建立新的签名身份，仅转换合法资产及附件，不复制原 plan、明文密钥、订阅和所有者标志。原文件/存储保持不变；完成后重新配置两盘。

“旧本机数据”需要在原系统账户、原 userData 和原文件来源中保全。当前应用不会主动扫描这些数据。曾经在浏览器或开发服务器地址下使用的数据不属于桌面来源，应在原环境保全并导出，由维护者核验后恢复。

旧数据可能在迁移前已经泄露或被篡改。迁移不能追溯修复旧副本，也不为旧内容补充历史来源证明。验证新资产、附件、导出和两盘恢复后，再由所有者决定旧数据的保留和销毁策略。

**旧 Rust v1 容器**：`crypt/` 已退役为独立只读抢救工具，不随应用打包。可用 `cargo test --manifest-path crypt/Cargo.toml --locked --offline` 验证，然后构建。仅保留 `unlock --user-key … --heir-key … --config … --vault … --output <不存在的新文件>`；旧生成/加密命令停用，日期不再阻止抢救。输出为明文，必须保管，且当前桌面迁移器不自动导入此 Rust v1 明文模型。应保留原件后人工核对字段再录入新密库，不宣称该历史协议是真正的 2-of-2。

## 文件损坏与上一版本恢复

读取/签名失败会显示损坏状态，不会自动清空或覆盖。

1. 退出应用，先复制整个原 userData 目录和 U 盘文件到安全位置。
2. 在另一个系统账户中，用两盘或已知所有者凭据验证备份可读，并核对资产数量、附件及版本。
3. 若选择 `.previous`，它可能少一次保存，并且可能仍使用旧密码、旧密钥或旧恢复代次；应使用对应凭据验证。
4. 需要重建原安装时，把损坏的 `vault-v3.llvault` 移到保全目录，不直接删除；再启动空安装，通过界面的导入入口恢复已验证备份。

这是明确的灾难恢复操作，可能恢复较旧数据；正常导入不会绕过版本检查。不要自动将损坏文件替换为 `.previous`，以免掩盖损坏或丢失最新资产。

## 维护约束

协议变更必须增加格式版本或给出明确兼容规则和测试；不得重新加入明文降级保存、固定种子、伪签名、模拟设备或仅由 UI 控制的管理员状态。测试需要覆盖异常路径和授权边界，不能只检查按钮文案。历史审计复现脚本对应审计时的旧提交，不是新实现的回归门禁。
