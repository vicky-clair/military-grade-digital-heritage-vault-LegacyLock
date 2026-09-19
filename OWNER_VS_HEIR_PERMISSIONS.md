# LegacyLock 军规遗产密钥库 — 所有者 (用户) 与 继承者 (法定继承人) 权限与功能全景对照文档

> **文档版本**：v1.1.0 (2026-09-19)  
> **适用系统**：Windows / macOS / Linux  
> **安全内核**：LVCF 2.0 (LegacyLock Vault Container Format) + LLCS-1 (Argon2id + AES-256-GCM + Ed25519)

---

## 一、 角色定义与安全设计哲学

| 维度 | 所有者 (用户 / Vault Owner) | 继承者 (法定继承人 / Designated Heir) |
| :--- | :--- | :--- |
| **角色定位** | 密库的合法创建者与全生命周期主控人 | 身后或紧急接管场景下的数字遗产承接人 |
| **持有凭证** | ① 锁屏主密码 (Master Password)<br>② 128位军规紧急安全密钥 (Secret Key)<br>③ 所有者专属主 U 盘 (`user-key.bin`) | ① 继承人接管口令 (Heir PIN)<br>② 继承人专属副 U 盘 (`heir-key.bin`)<br>③ 必须同时持有【所有者主 U 盘】 |
| **核心安全原则** | **最高控制权原则**：拥有增、删、改、查、销毁、配置与外发导出的完全自由。 | **单向只读与不可逆阻断原则**：允许全面查阅与合法交接，严禁修改、篡改、删除或销毁资产；必须输入所有者双凭据方可提升权限。 |

---

## 二、 所有者 VS 继承者 核心功能逐项对照表

下表已逐条对照项目源码中的执行逻辑完成严格核实：

| 功能大类 | 具体操作项 | 所有者 (用户) 权限 | 继承者 权限 | 代码实现位置与安全拦截机制 |
| :--- | :--- | :---: | :---: | :--- |
| **1. 应用解锁与接入** | **输入主密码解锁** | ✅ 允许 | ❌ 禁止（无主密码） | [`LockScreen.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/LockScreen.tsx) 校验 Argon2id 密码哈希 |
| | **双 U 盘免密硬件解锁** | ✅ 允许（亦可使用） | ✅ **核心通道** (只读查看) | 插入【所有者主盘 + 继承人盘】且指纹匹配后，直接进入只读接管模式 |
| | **单 U 盘插拔解锁** | ❌ 阻断（必须双盘） | ❌ 阻断（必须双盘） | [`LockScreen.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/LockScreen.tsx) 与 [`cryptoService.ts`](file:///c:/XMWJJ/xr-LegacyLock/src/services/cryptoService.ts) 强制要求双盘在位 |
| **2. 资产查阅与接管** | **查看全部分类数字资产** | ✅ 允许 | ✅ **允许 (全量查阅)** | [`HeirRecoveryView.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/HeirRecoveryView.tsx) 提供分类筛选与实时搜索 |
| | **密码/私钥明文切换查看** | ✅ 允许 | ✅ **允许 (即时解密显示)** | 继承人可点击眼睛图标查阅密码明文，便于接管各类账户 |
| | **安全复制账号与密码** | ✅ 允许 (30s自毁) | ✅ **允许 (30s自毁)** | 均调用 `clipboardService.ts`，写入剪贴板后 30 秒自动清空，防常驻窥探 |
| | **查看遗产遗嘱身后嘱托** | ✅ 允许编写与查阅 | ✅ **重点查阅 (专属指示)** | [`HeirRecoveryView.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/HeirRecoveryView.tsx) 突出显示所有者生前留下的接管执行备忘 |
| | **导出解密接管交接清单 (JSON)** | ✅ 允许全量备份 | ✅ **允许 (标准化交接单)** | 生成包含继承人姓名、时间戳与遗产明细的结构化 JSON 接管档案 |
| | **打印纸质遗产交接清单** | ✅ 允许打印留档 | ✅ **允许 (A4 打印归档)** | 唤起标准浏览器/系统打印流，供公证机构或离线签署归档 |
| **3. 资产修改与破坏防御** | **新增资产条目** | ✅ 允许 (自由录入) | ❌ **严格禁止 (界面+逻辑双阻断)** | [`App.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/App.tsx) `handleAddNew` 强制阻断并弹出接管控制权认证窗 |
| | **编辑与保存已有资产** | ✅ 允许 (自由修改) | ❌ **严格禁止 (只读锁定)** | [`ItemModal.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/ItemModal.tsx) 锁定保存按钮，提示“继承人只读” |
| | **删除单项资产条目** | ✅ 允许 | ❌ **严格禁止 (按钮隐藏+逻辑拦截)** | [`App.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/App.tsx) `handleDeleteItem` 拦截并阻断删除操作 |
| | **一键数据紧急自毁 (WIPE)** | ✅ 需两次强确认输入 `DESTROY` | ❌ **彻底禁止 (硬件与权限绝对拦截)** | [`App.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/App.tsx) `handleEmergencyWipe` 检测到只读身份时立即弹窗拒绝 |
| **4. 权限提升 (转为所有者)** | **解除只读接管控制权** | — (本就是所有者) | ✅ **凭证满足时允许** | 点击【接管控制权】，必须验证**所有者主密码 + 128位紧急安全密钥** |
| **5. U 盘硬件配置与防克隆** | **配置双 U 盘密码与私钥** | ✅ 允许在设置中配置 | ❌ 仅所有者专享 | [`UsbPasswordModal.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/UsbPasswordModal.tsx) 生成双盘密钥并注入硬件绑定签名 |
| | **强转/复制密钥至未授权 U 盘** | ❌ 硬件指纹拦截 | ❌ **防克隆硬件拦截** | 读取物理卷序列号/UUID 与 `.legacylock-device.sig` 比对，不匹配拒绝解锁 |
| **6. 跨平台备份与恢复** | **加密备份导出** | ✅ 自由指定输出目录 | ❌ 只读模式下无须更改密包 | 支持本地自定义路径导出与外接驱动器导出 |
| | **双 U 盘解密导入** | ✅ 允许 | ✅ **允许 (导入后自动置为只读)** | 导入密包后以只读模式展现，保护原始资产不受误改 |
| | **跨 Windows/macOS/Linux 兼容** | ✅ 纯 UTF-8 无乱码 | ✅ 纯 UTF-8 无乱码 | 标准 `TextEncoder`/`TextDecoder` 编码，杜绝系统间编码差异与乱码 |

---

## 三、 代码逻辑一致性核对细节

在编写本对照文档的过程中，我们对核心代码进行了全量审查并落实了以下安全加固，确保代码逻辑与权限矩阵 100% 吻合：

### 1. 继承人模式下的多重拦截 (Multi-Layer Defense)
- **UI 呈现层**：
  - 继承人双 U 盘解锁后，应用直接载入专属只读工作台 [`HeirRecoveryView.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/HeirRecoveryView.tsx)，隐藏增删改入口，呈现醒目的紫色 `READ-ONLY HEIR` 军规只读横幅。
  - 资产详情弹窗 [`ItemModal.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/ItemModal.tsx) 自动切换为“查阅模式”，隐藏删除按钮，保存按钮替换为 `🛡️ 继承人只读 (点击接管修改权)`。
- **状态管理层**：
  - [`App.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/App.tsx) 中维持 `heirCanModify = false` 状态。在 `handleAddNew`、`handleSelectCategoryFromPicker`、`handleSaveItem`、`handleDeleteItem` 每一个底层数据操作入口，均第一优先级拦截 `if (!heirCanModify)`，直接阻止数据变更并唤起 [`TakeoverControlModal.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/TakeoverControlModal.tsx)。
- **数据自毁防护**：
  - [`App.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/App.tsx) 的 `handleEmergencyWipe` 中，若检测到处于只读接管模式，直接弹窗拒绝对话并返回，彻底防止继承人误触或恶意清空所有者的密库。
- **退出接管模式的闭环锁屏**：
  - 在 [`HeirRecoveryView.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/HeirRecoveryView.tsx) 中点击“退出接管模式”时，系统**强制调用 `setIsLocked(true)`**，立即锁闭屏幕回到军规锁屏遮罩，彻底杜绝跳过密码认证直通所有者可编辑界面的逻辑漏洞。

### 2. 接管控制权的密码学闭环 (Elevation of Privilege)
- 当继承人（或代理人）确有必要修改密库（如完成资产过户后注销条目）时，必须通过 [`TakeoverControlModal.tsx`](file:///c:/XMWJJ/xr-LegacyLock/src/components/TakeoverControlModal.tsx)：
  - **因子 1**：所有者生前设定的主密码；
  - **因子 2**：所有者留在遗嘱或安全信封中的 128 位紧急安全密钥（Secret Key）。
- 只有两个因子同时在客户端本地经 Argon2id 重新派生并验证成功，系统才会将 `operatingMode` 提升为 `OWNER`，并将 `heirCanModify` 重设为 `true`。

### 3. U 盘硬件防克隆机制 (Anti-Cloning Enforcement)
- 继承人专属 U 盘内不仅存放 `heir-key.bin`，还包含由系统写入的 `.legacylock-device.sig`；
- 该签名融合了目标 U 盘的物理硬件指纹（Windows: `VolumeSerialNumber`，macOS: 卷宗底层 UUID，Linux: 物理序列号）；
- 若继承人试图将密钥文件简单复制到其他未注册的普通 U 盘，系统在探查阶段即比对失败，并在锁屏与导入界面明确给出硬件克隆警告并拒绝解锁。

---

## 四、 总结

LegacyLock 严格遵循**“生前所有者独揽全权，身后继承人受控查阅”**的军规安全准则：
1. **用户（所有者）**：享有完整的资产管理、介质定制与最高安防控制权；
2. **继承者**：享有充分的知情权、查阅权与合法交接单据生成权，但在未取得所有者双重法定凭据（密码 + 密钥）前，系统从物理硬件、UI 组件到内存状态层层设防，**绝对无法改动或破坏任何一条既有数据**。
