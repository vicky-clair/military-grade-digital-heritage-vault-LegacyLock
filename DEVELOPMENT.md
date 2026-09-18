# LegacyLock 军规遗产密钥库 — 完整开发技术文档

> **项目名称**：LegacyLock 军规遗产密钥库 (Military-Grade Digital Heritage Vault)  
> **文档版本**：v2.5.0 LTS (Military Build)  
> **容器标准**：LVCF 2.0 (LegacyLock Vault Container Format)  
> **加密套件**：LLCS-1 (AES-256-GCM + PBKDF2 100k + X25519 + Ed25519)  
> **架构定位**：100% 纯离线冷存储、零云端依赖、双 U 盘 / 移动硬盘物理隔离数字遗产保险箱

---

## 一、 项目背景与设计哲学

在数字化时代，个人的核心资产（加密货币冷钱包助记词、银行凭证、房产信托公证、服务器私钥、核心网站登录、社交遗产）高度碎片化并依赖密码。传统的中心化云端密码管理器存在被攻破、账号停用或服务商倒闭的“单点云端风险”；而纯本地明文保存又无法安全交付给法定继承人。

**LegacyLock** 专为跨世代长周期（30 年+）数字遗产保管而生，遵循以下核心军规原则：
1. **零云端、零网络上报（Zero Telemetry & 100% Offline）**：软件不建立任何远程连接，不依赖任何中心化服务器，数据只在用户的本地设备与物理移动存储介质上流转；
2. **物理双钥匙隔离（2-of-2 Hardware Key Separation）**：所有者钥匙（`user-key.bin`）与继承人钥匙（`heir-key.bin`）在数学上正交分离。单凭继承人盘绝对无法解密密库，必须两件物理介质同时插入设备，方可联合激活并解锁；
3. **介质普适性（All-Media Support）**：不仅支持普通 USB 闪存盘，还全面原生识别外接 USB 移动硬盘（External HDD）、移动固态硬盘（USB SSD），支持大容量长期冷存；
4. **继承人只读保护（Heir Read-Only Mode）**：继承人通过副盘接管时，系统进入单向只读审计模式，严禁篡改、删除或批量清空历史资产，确保数字遗产的法律真实性。

---

## 二、 密码学体系与安全架构 (LLCS-1)

LegacyLock 的密码学实现分为前端 WebCrypto 安全层与 Rust 原生底层（双向互通），全链路杜绝任何暴力破解或旁路破解漏洞。

### 1. 密码学算法矩阵

| 模块 | 算法 / 机制 | 作用与防破解指标 |
| :--- | :--- | :--- |
| **主对称加密** | **AES-256-GCM** (AEAD) | 256 位密钥长度，具备认证标签（Auth Tag）。穷举破解需要消耗超越已知宇宙尺度的物理能量，任何比特篡改均会导致解密直接失败。 |
| **密钥派生函数** | **PBKDF2-HMAC-SHA256 (100,000 轮)** | 100,000 次强化迭代并混合 16 字节随机盐（Salt），彻底废除彩虹表预计算与 GPU/ASIC 离线字典爆破。 |
| **非对称密钥交换** | **Curve25519 (X25519) Diffie-Hellman** | 128 位军规安全水位，主副两把钥匙通过非对称椭圆曲线协商派生共享根会话密钥，具备高强度抗量子前向安全性。 |
| **数字签名体系** | **Ed25519 所有者签名** | 对密库 Manifest 摘要（SHA-256）进行非对称离线签名，确保资产库为密库合法所有者创建，防范伪造与中间人注入。 |
| **真随机数生成** | **12 字节密码学安全 Nonce** | 每次加密均从操作系统底层高熵随机池提取全新 Nonce，严格杜绝 Nonce-Reuse（重用）攻击。 |
| **防回滚与防降级** | **递增 Sequence + Generation 双计数器** | 密文头包含世代计数与序列号，签名严格校验，拒绝任何通过旧版密库覆盖新密库的重放攻击。 |

### 2. 双 U 盘二进制密钥与时效设计
- **主介质（所有者盘）**：存放 `user-key.bin`（64 字节：32 字节 X25519 私钥 + 32 字节公钥）；
- **副介质（继承人接管盘）**：存放 `heir-key.bin`（64 字节：32 字节 X25519 私钥 + 32 字节公钥）；
- **配置文件**：存放 `config.bin`（40 字节：8 字节大端整数时间戳 + 32 字节继承人公钥哈希）。超出有效期限后，离线解密引擎将实施密码学安全拦截。

---

## 三、 系统模块与核心功能设计

### 1. 资产全生命周期管理（12 大资产维度）
系统支持 12 种核心资产分类，每种分类均具备专属的结构化凭证字段体系：
1. **登录信息 (Login)**：网站、应用账号、动态二次验证（2FA）口令；
2. **安全备注 (Note)**：私密便签、遗嘱说明、保险柜物理口令；
3. **身份标识 (Identity)**：身份证、护照、社保号与法律身份文件；
4. **信用卡 (Card)**：银行卡、国际结算账户、存单与 CVV 安全码；
5. **独立密码 (Password)**：设备锁屏 PIN 码、BIOS 口令与物理钥匙口令；
6. **加密文档 (Document)**：房产协议、信托合约、软件授权证书；
7. **SSH 密钥 (SSH Key)**：服务器根私钥、Git 代码库凭据；
8. **API 凭据 (API Credential)**：云平台令牌、AI 接口服务密钥；
9. **加密钱包 (Crypto Wallet)**：区块链冷钱包、BIP39 助记词、私钥；
10. **服务器与数据库 (Server)**：Linux VPS、生产数据库连接串；
11. **无线路由器 (Router)**：网络管理密码、WiFi 访问密钥、NAS 口令；
12. **会员与资产 (Membership)**：积分奖励、数字藏品、游戏资产与健康医疗档案。

### 2. 界面与交互重构（紧凑对称的现代化军规美学）
- **左侧导航侧边栏**：
  - 各分类名称与右侧真实数据 100% 保持一致，动态展现当前收录总计徽标；
  - 彻底去除无用冗余按钮，底端升级为常驻的 **「系统设置」** 入口（配备齿轮图标与版本号 `v2.5.0`）。
- **顶部工具栏（消除大面积留白，均衡对称）**：
  - 左侧：**`[+ 添加新资产 / 密钥]`** 主行动按钮 + **`[🔍 搜索框]`**；
  - 中部快捷工具组：
    - **`[🎨 渐变主题]`**：点击下拉切换 5 款军规渐变配色（幻紫星雲、極光深空、黑曜玄金、深海冰川、賽博暗夜）；
    - **`[🔑 U盘密码]`**：高亮青色胶囊按钮，快速配置/修改介质 PIN 码；
    - **`[🛡️ 密库自检]`**：高亮绿色胶囊按钮，一键触发密码学完整性 6 项自检。
- **美化资产录入交互**：
  - 点击「添加新资产/密钥」首先唤起 **资产分类选择器（你想要添加什么？）**；
  - 选择后弹出单独的精美模态表单，配备 20 位高强度真随机密码发生器、自定义键值对字段扩展，以及密码明文/掩码切换开关。

### 3. 系统设置与军规安全控制中心 (`SettingsView`)
在系统设置内实现了六大核心功能模块：
1. **外部存储硬件与介质识别中心**：
   - 实时识别外接移动硬盘（USB HDD）、移动固态（USB SSD）与普通 U 盘；
   - 展示驱动器盘符（如 `D:\`）、型号卷标、文件系统（NTFS/FAT32/exFAT/APFS/ext4）、总容量与可用空间比例，以及 `user-key.bin`、`heir-key.bin`、`config.bin` 探测状态；
   - 配备一键「重新检测」按钮与扫描动画。
2. **应用技术规格说明**：
   - 声明软件版本（`v2.5.0 LTS Military Build`）、容器格式（`LVCF 2.0`）、加密套件（`LLCS-1`）、哈希与防回滚机制，附带零云端零遥测安全背书。
3. **重要安全提醒与灾难防范指南**：
   - **U 盘丢失/物理损坏 = 永久不可恢复**：系统不设云端副本，无备用钥匙将造成永久不可逆灭失；
   - **忘记介质口令 = 永久丧失访问权**：系统杜绝任何超级密码或短信找回后门；
   - **严格执行「双 U 盘异地容灾」策略**：主盘随身/书房保管，副盘异地银行保管箱或律所密封封存；
   - **继承人单向只读接管规范**：副盘接管仅允许读取资产，禁止篡改或删除历史密库；
   - **闪存介质寿命防范与定期重写**：建议每 12~18 个月插入电脑自检并执行无损迁移刷新电荷浮栅。
4. **实用安全偏好控制**：
   - **无操作自动锁屏**：可选择 5 分钟、15 分钟（推荐）、30 分钟、60 分钟或从不；
   - **剪贴板 30 秒自动清空**：复制敏感密码后自动擦除系统剪贴板，防范木马嗅探；
   - **资产卡片默认掩码隐藏**：默认以 `••••••••` 掩码显示密码，点击方可明文查看；
   - **纸质应急救援密封单（Paper Key Sheet）**：生成包含密库唯一识别码、保管说明的 A4 继承卡片，支持一键打印与密封物理留档；
   - **介质无损迁移升级向导**：支持将旧 U 盘数据克隆迁移至新高速移动固态或机械硬盘。
5. **系统外观与主题偏好（跨重启永久保存）**：
   - 提供了可视化的 5 种主题选择卡片，系统联动底层操作系统配置，重启软件后 100% 沿用最后一次修改，杜绝还原。
6. **全链路 UTF-8 字符集防乱码技术认证**：
   - 统一采用国际标准 UTF-8 编码与多层中文字体栈备援，确保中文资产名称、长备注与 Emoji 永远不乱码。
7. **危险区域（军规紧急数据销毁）**：
   - 需手动输入防误触确认指令 `ERASE-ALL`，一键物理覆写清空本地与介质内的所有数据。

---

## 四、 跨平台硬件驱动器识别底层实现

针对用户提出的“为什么检测不到移动硬盘、确认在三大平台 Windows/macOS/Linux 下都能正常识别”的核心问题，技术方案实施了彻底的重构：

### 1. Windows 平台实现
- **问题排查**：原先代码仅从 `E:` 盘开始扫描，而用户系统的 2TB 移动硬盘在 Windows 下被分配为 `D:\`，因此被彻底跳过；此外，移动硬盘常归类为 `DriveType: 3 (Fixed Disk)`，但其物理总线为 `BusType: USB`。
- **技术解决**：
  ```javascript
  // 1. 获取所有物理总线为 USB 的磁盘编号
  Get-Disk | Where-Object { $_.BusType -eq 'USB' } | Select-Object -ExpandProperty Number
  // 2. 获取分区与盘符关联映射
  Get-Partition | Where-Object DriveLetter | Select-Object DiskNumber, DriveLetter
  // 3. 读取逻辑卷标、总容量、可用空间与文件系统
  Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, DriveType, Size, FreeSpace, FileSystem
  ```
- **A~Z 全量兜底**：即便在受限或无 PowerShell 环境下，系统以循环轮询 A~Z 盘符（自动跳过系统盘 `C:`），保证绝不遗漏包括 `D:` 在内的任何外接驱动器。

### 2. macOS 平台实现
- 自动扫描 `/Volumes/*` 挂载目录；
- 智能过滤 `Macintosh HD`、`Macintosh HD - Data`、`Recovery`、`Preboot` 等内置系统卷；
- 调用 `statfs` 精准读取外接介质的块大小、总扇区容量与剩余空间。

### 3. Linux 平台实现
- 执行原生命令：
  ```bash
  lsblk -J -b -o NAME,MOUNTPOINT,LABEL,RM,HOTPLUG,SIZE,TYPE,FSTYPE,TRAN,MODEL
  ```
- 严格捕获 `TRAN == "usb"`、`RM == true` 以及挂载于 `/media/*`、`/run/media/*`、`/mnt/*` 的设备；
- 提供 `/media` 目录结构递归扫描作为系统兜底方案。

---

## 五、 配色持久化与字符编码安全

### 1. 配色持久化（解决重启恢复默认配色的痛点）
- **Electron 系统层配置**：在主进程中注册 `app:get-settings` 与 `app:save-settings` IPC，直接写入系统用户数据目录（Windows 下为 `%APPDATA%/LegacyLock/legacylock_settings.json`）；
- **前端存储层**：同步写入 `localStorage.setItem('legacylock_theme', themeId)`；
- **启动恢复机制**：应用初始化时优先从系统配置文件恢复上次主题，并同步注入至 `document.documentElement` 与 `document.body`，消除了加载过程中的背景跳跃与颜色回退。

### 2. 全链路 UTF-8 防乱码保障
- **文件导入**：在 `FileReader` 中显式传递 `'UTF-8'` 参数（`reader.readAsText(file, 'UTF-8')`），消除了 Windows 繁体或系统区域代码页（如 GBK/CP936）对中文内容的转码污染；
- **文件导出**：通过 `new TextEncoder().encode(content)` 产生无损字节数组，并声明 `application/json;charset=utf-8`；
- **全局字体栈**：注入现代高质量中文字体降级方案：
  ```css
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Roboto, 'Noto Sans SC', sans-serif;
  ```
  避免了字体替换失败产生的豆腐块（Tofu）现象。

---

## 六、 编译、构建与运行指南

### 1. 环境要求
- Node.js 18.x 或更高版本；
- Rust 1.70+ 与 Cargo（用于编译本地 CLI 工具，可选）；
- 支持 Windows 10/11、macOS 12+、Ubuntu 20.04+。

### 2. 开发与运行命令
```bash
# 安装前端依赖
npm install

# 启动本地开发服务 (支持 HMR 热重载)
npm run dev

# 启动原生 Electron 桌面端客户端
npm run electron

# 或直接在 Windows 双击运行启动脚本
.\启动LegacyLock.bat
```

### 3. 生产编译与打包
```bash
# 执行 TypeScript 类型安全检查
npx tsc --noEmit

# 构建前端生产静态包 (输出至 dist/ 目录)
npm run build
```

---

## 七、 技术资产与文件结构清单

```text
xr-LegacyLock/
├── crypt/                   # Rust 密码学核心工具 (X25519, AES-256-GCM, PBKDF2)
│   ├── Cargo.toml
│   └── src/
│       ├── crypto.rs        # 密码学算法实现与双U盘密钥协商
│       ├── lib.rs           # 核心导出库
│       └── main.rs          # vault-cli 命令行执行入口
├── electron/                # Electron 桌面原生主进程
│   ├── main.cjs             # 三大平台外接硬盘/U盘扫描引擎与持久化存储
│   └── preload.cjs          # 安全上下文桥接层 (IPC API 注入)
├── src/                     # React 前端渲染层
│   ├── components/
│   │   ├── CategoryPickerModal.tsx  # 资产分类选择弹窗 (你想要添加什么？)
│   │   ├── ImportExportView.tsx     # 军规加密导入导出 (UTF-8 强制规范)
│   │   ├── ItemModal.tsx            # 资产录入/编辑弹窗与20位密码生成器
│   │   ├── RightContentArea.tsx     # 主工作区与顶部平衡工具栏
│   │   ├── SettingsView.tsx         # 系统设置、硬件识别卡片与安全中心
│   │   └── Sidebar.tsx              # 左侧分类栏与底部常驻设置按钮
│   ├── services/
│   │   ├── categories.tsx   # 12 类资产字段模型与语义解析
│   │   ├── cryptoService.ts # 前端 WebCrypto 加密、自检与解锁接口
│   │   ├── mockData.ts      # 初始资产示例数据
│   │   └── themes.ts        # 5 套军规渐变主题配色规范
│   ├── types/               # 全局 TypeScript 接口模型与介质规范
│   ├── App.tsx              # 应用顶层状态编排、持久化恢复与硬件启动检测
│   └── index.css            # 完整设计系统、中文字体栈与组件样式
├── DEVELOPMENT.md           # 本开发技术手册
├── README.md                # 项目开源主文档
├── package.json
├── vite.config.ts
└── 启动LegacyLock.bat       # Windows 桌面一键启动脚本
```

---
*文档由 LegacyLock 核心架构团队制定与归档。*
