# 🛡️ LegacyLock (军规遗产密钥库)

<div align="center">

![LegacyLock Logo](https://img.shields.io/badge/LegacyLock-Vault_v2.5.0_LTS-00D4FF?style=for-the-badge&logo=shield&logoColor=white)
![Security Standard](https://img.shields.io/badge/Security-Military_Grade_LLCS--1-10B981?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Cipher-AES--256--GCM_+_PBKDF2_100k-8B5CF6?style=for-the-badge)
![Zero Cloud](https://img.shields.io/badge/Network-100%25_Offline_Cold_Storage-F59E0B?style=for-the-badge)
![Cross Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-6366F1?style=for-the-badge)

<br/>

**100% 纯离线冷存储 · 物理隔离双钥匙协同 · 跨世代数字遗产安全保险箱**

*两个硬件介质（U盘 / 移动硬盘）同时接入设备方可解密，让数字遗产离世后永不丢失，生前绝对安全。*

[📖 查阅完整开发手册 (DEVELOPMENT.md)](./DEVELOPMENT.md) · [🚀 快速开始](#-快速上手运行) · [🔐 密码学规范](#-军规密码学与安全架构) · [💾 硬件驱动器识别](#-全平台硬件识别)

</div>

---

## 🌟 项目愿景与设计哲学

在数字化时代，助记词、比特币私钥、银行凭证、房产信托合约与核心网络账号分散在各个角落。传统的云端密码管理器存在被攻破、服务商跑路或账号封禁的不可逆风险；而单点明文保存又无法合法、安全地交付给法定继承人。

**LegacyLock** 专为跨世代（30 年+）数字遗产安全保管而生：
- **零网络、零云端（100% Offline）**：全系统无中心化服务器，绝不发起任何网络请求，彻底阻断黑客远程嗅探与云端泄露；
- **双钥匙物理隔离（2-of-2 Hardware Threshold）**：所有者钥匙（`user-key.bin`）与继承人钥匙（`heir-key.bin`）在数学上严格正交。任何单把钥匙在数学上绝对无法解密资产，必须双物理介质同时接入方可激活；
- **外接硬盘与 U 盘普适支持**：深度适配普通 USB 闪存盘、USB 移动机械硬盘（HDD）与移动固态硬盘（SSD），支持 Windows（含 D 盘及后续盘符）、macOS 与 Linux；
- **继承人单向只读接管**：继承人使用副盘接管时，系统处于只读模式，禁止篡改或删除历史密库，捍卫数字遗产法律真实性。

---

## ⚡ 核心功能特性一览

### 1. 12 大维度数字资产结构化存储
支持录入管理 12 类核心数字遗产，每种类型配备专属字段模型：
- **🔑 登录信息**：网站凭据、应用账号、2FA 恢复码；
- **📝 安全备注**：私密遗嘱、便签说明、物理保险箱暗码；
- **🪪 身份标识**：身份证、护照、社保号与法律身份凭据；
- **💳 信用卡与金融**：银行卡、国际账户、定期存单；
- **🔒 独立密码**：设备锁屏口令、BIOS 与硬件密码；
- **📑 加密文档**：房产合约、信托协议、软件授权许可；
- **💻 SSH 密钥**：服务器根私钥、代码仓库部署凭证；
- **🌐 API 凭据**：云服务令牌、AI 开发者密钥；
- **🪙 加密钱包**：区块链冷钱包、BIP-39 助记词、私钥明文；
- **🖥️ 服务器与数据库**：VPS 主机、生产数据库访问凭据；
- **📶 无线路由器**：家庭主路由口令、WiFi 密码、NAS 存储；
- **🎖️ 会员与资产**：积分会员、游戏资产、医疗健康档案。

### 2. 紧凑平衡的现代化军规美学界面
- **左侧导航侧边栏**：分类与资产实时联动，动态显示真实收录徽标计数；底端设立常驻 **「系统设置」** 入口；
- **顶部均衡工具栏**：
  - 左侧：**`[+ 添加新资产 / 密钥]`** 主行动按钮 + 实时搜索框；
  - 中部快捷工具组：
    - **`[🎨 渐变主题]`**：支持实时切换 5 套军规渐变配色；
    - **`[🔑 U盘密码]`**：高亮快捷设置硬件介质保护口令；
    - **`[🛡️ 密库自检]`**：一键执行 6 项密码学完整性健康检查。
- **美化资产录入弹窗**：分类选择器 + 独立模态表单，内置 20 位高强度真随机密码生成器与明文/掩码切换。

### 3. 系统设置与安全控制中心 (`SettingsView`)
- **外部存储硬件识别卡片**：实时展示外接介质的挂载路径（如 `D:\`）、型号、文件系统、物理容量与可用空间比例，探查钥匙文件状态；
- **重要安全提醒指南**：U 盘丢失永久不可逆灭失警示、无后门重置机制说明、双盘异地容灾策略与闪存电荷寿命维护防范；
- **高级实用安全偏好**：
  - 无操作自动锁定时间（5/15/30/60分钟/从不）；
  - 敏感凭据剪贴板 30 秒自动清空；
  - 资产卡片默认以 `••••••••` 掩码隐藏；
  - **纸质应急救援密封单（Paper Key Sheet）**：生成包含密库唯一标识码与保管指南的标准 A4 离线卡片，支持一键打印与密封物理留档；
  - **介质无损平滑迁移向导**：支持旧介质数据克隆至新移动固态硬盘；
- **系统外观永久保存**：配色设置联动系统底层 `settings.json`，重启软件 100% 沿用最后一次修改，杜绝还原；
- **全链路 UTF-8 防乱码保障**：规范文件导入/导出编解码与中文字体降级栈，确保中文与符号永不乱码；
- **军规级紧急数据销毁**：需输入防误触指令 `ERASE-ALL`，一键物理擦除清空本地与介质数据。

---

## 🔐 军规密码学与安全架构 (LLCS-1)

```text
       ┌─────────────────────────────────────────────────────────────┐
       │              物理隔离双钥匙联合激活架构 (2-of-2)               │
       └─────────────────────────────────────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
     【所有者主介质 (User USB)】                   【继承人副介质 (Heir USB)】
    存放: user-key.bin (64B)                      存放: heir-key.bin (64B)
    (X25519 私钥 + 公钥)                          (X25519 私钥 + 公钥)
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                        Curve25519 双向密钥协商
                 DH(User_Priv, Heir_Pub) == DH(Heir_Priv, User_Pub)
                                      │
                                      ▼
                          PBKDF2-HMAC-SHA256 派生
                       (100,000 轮安全迭代 + 16B 随机盐)
                                      │
                                      ▼
                     AES-256-GCM (256位高强度认证解密)
                     (12B 随机 Nonce + 内置 Auth Tag 验签)
                                      │
                                      ▼
                       【解锁还原本地数字遗产资产库】
```

### 安全算法指标
- **主对称加密**：`AES-256-GCM` (AEAD 认证加密，256 位密钥，$2^{256}$ 宇宙级抗穷举空间)；
- **密钥派生算法**：`PBKDF2-HMAC-SHA256`（100,000 次强化迭代，免疫彩虹表与 GPU 暴力破解）；
- **非对称协议**：`Curve25519 (X25519)` 椭圆曲线 Diffie-Hellman 密钥协商；
- **数字签名体制**：`Ed25519` 所有者非对称数字签名，防范中间人篡改；
- **随机源保障**：操作系统内核安全熵池（WebCrypto / Rust `OsRng`）；
- **防回滚防重放**：`Sequence` 序号递增 + `Generation` 世代计数双重哈希校验。

---

## 💾 全平台硬件识别 (Windows / macOS / Linux)

LegacyLock 具备强大的原生驱动器探查引擎，彻底打破传统工具只能读取特定 U 盘盘符的限制：

| 平台 | 底层探测机制 | 支持介质与特性 |
| :--- | :--- | :--- |
| **Windows** | PowerShell WMI/CIM `Win32_LogicalDisk` 结合 `Get-Disk (BusType: USB)` 与分区映射 | 完美识别包括 **`D:` 盘** 在内的所有逻辑盘符；智能区分 **USB 移动机械硬盘 (HDD)**、**移动固态 (SSD)** 与普通 U 盘；提供 A~Z 字母盘符轮询兜底。 |
| **macOS** | 扫描 `/Volumes/*` 并结合 `statfs` 系统调用 | 自动过滤 `Macintosh HD`、`Recovery` 等内置宗卷，获取外接卷标、容量与文件系统。 |
| **Linux** | 原生 `lsblk -J -b` 结合 `/media` 与 `/run/media` 挂载扫描 | 精准捕获 `TRAN == "usb"` 以及可移动热插拔存储设备。 |

---

## 🎨 5 套军规深色渐变主题

系统提供精心调优的高对比度现代渐变主题，并在系统设置中提供实时选择与永久持久化：
1. **幻紫星雲 (Royal Indigo)**：经典深紫与宝石蓝微光；
2. **極光深空 (Midnight Aurora)**：赛博青绿与极地深邃暗夜；
3. **黑曜玄金 (Obsidian Gold)**：高贵黑曜石底色与香槟金质感；
4. **深海冰川 (Ocean Glacier)**：深海湛蓝与冰川晶莹高光；
5. **賽博暗夜 (Cyberpunk Neon)**：深空纯黑与赛博霓虹粉紫点缀。

---

## 🚀 快速上手运行

### 环境准备
- [Node.js](https://nodejs.org/) (v18.0 或更高版本)
- [Rust & Cargo](https://www.rust-lang.org/) (可选，用于本地构建密码学底层)

### 1. 克隆项目与安装依赖
```bash
git clone https://github.com/vicky-clair/military-grade-digital-heritage-vault-LegacyLock.git
cd military-grade-digital-heritage-vault-LegacyLock
npm install
```

### 2. 启动开发与桌面客户端
```bash
# 启动本地开发服务 (支持前端热重载)
npm run dev

# 启动 Electron 原生桌面客户端
npm run electron

# Windows 用户可直接双击运行启动脚本：
.\启动LegacyLock.bat
```

### 3. 构建生产包
```bash
# 执行 TypeScript 类型安全检查
npx tsc --noEmit

# 构建生产包 (静态资产输出至 dist/ 目录)
npm run build
```

---

## 📂 项目结构概览

```text
xr-LegacyLock/
├── crypt/                   # Rust 密码学核心工程 (X25519, AES-256-GCM, CLI)
├── electron/                # Electron 桌面原生主进程与跨平台驱动器探查引擎
│   ├── main.cjs             # Windows/macOS/Linux 外接硬盘扫描与配置持久化
│   └── preload.cjs          # 安全 IPC 桥接层
├── src/                     # React 19 + TypeScript 前端渲染层
│   ├── components/          # 视图组件 (CategoryPicker, ItemModal, SettingsView等)
│   ├── services/            # 密码学调用、主题规范、数据模型
│   ├── types/               # 接口规范与 LVCF 2.0 数据结构
│   ├── App.tsx              # 应用状态编排、持久化恢复与硬件启动检测
│   └── index.css            # 现代军规设计系统、中文字体栈与样式
├── DEVELOPMENT.md           # 详细技术架构与开发文档
├── README.md                # 本文档
└── 启动LegacyLock.bat       # Windows 桌面一键启动脚本
```

---

## 📄 开源许可证与安全申明

- **许可证**：基于 [MIT License](./LICENSE) 开源发布。
- **免责申明**：LegacyLock 遵循纯离线冷存储规范，无任何云端备份与恢复后门。请务必妥善保管物理介质与备份口令，执行「双盘异地容灾」策略。物理介质丢失且未留备份所造成的资产灭失属于不可逆密码学现象。
