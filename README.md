# 🛡️ LegacyLock (Military-Grade Digital Heritage Vault)

<div align="center">

![LegacyLock Logo](https://img.shields.io/badge/LegacyLock-Vault_v2.5.0_LTS-00D4FF?style=for-the-badge&logo=shield&logoColor=white)
![Security Standard](https://img.shields.io/badge/Security-Military_Grade_LLCS--1-10B981?style=for-the-badge)
![Security Audit](https://img.shields.io/badge/Audit-Passed_Zero_Vulnerability-059669?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Cipher-AES--256--GCM_+_PBKDF2_100k-8B5CF6?style=for-the-badge)
![Zero Cloud](https://img.shields.io/badge/Network-100%25_Offline_Air--Gapped-F59E0B?style=for-the-badge)
![Cross Platform](https://img.shields.io/badge/Platform-Windows_%7C_macOS_%7C_Linux-6366F1?style=for-the-badge)
![Clean Exit](https://img.shields.io/badge/Process_Exit-Zero_Zombie_Guarantee-brightgreen?style=for-the-badge)

<br/>

**100% Offline Air-Gapped Cold Storage · 2-of-2 Hardware Key Separation · Cross-Generational Digital Heritage Vault**

*Two physical storage media (USB Flash / External HDD / SSD) must be plugged into the device simultaneously to unlock. Digital heritage is never lost after passing, and 100% secure during lifetime.*

<br/>

### 🌐 Language Navigation / 语言切换 / 言語切替
**[English](#-english)** · **[中文 (Chinese)](#-中文-chinese)** · **[日本語 (Japanese)](#-日本語-japanese)**

<br/>

### 📚 Official Manuals / 核心手册 / 公式マニュアル
[👤 **Owner Manual (USER_MANUAL.md)**](./USER_MANUAL.md) · [🗝️ **Heir Manual (HEIR_MANUAL.md)**](./HEIR_MANUAL.md)  
[⚖️ **Permissions Matrix (OWNER_VS_HEIR_PERMISSIONS.md)**](./OWNER_VS_HEIR_PERMISSIONS.md) · [📖 **Dev & Audit Guide (DEVELOPMENT.md)**](./DEVELOPMENT.md)

</div>

---

<div id="-english"></div>

## 🇬🇧 English

### 1. Overview & Core Philosophy

In the digital era, private keys, crypto seed phrases, bank credentials, real-estate trusts, and server root credentials are fragmented and vulnerable. Centralized cloud password managers suffer from single-point cloud breaches, account terminations, or provider bankruptcy; simple plaintext files, on the other hand, cannot be safely bequeathed without risking premature exposure.

**LegacyLock** is purpose-built for multi-decade (30+ years) digital asset preservation with strict military-grade principles:
- **100% Offline & Air-Gapped**: Zero telemetry, zero analytics, zero external network requests. Internal data never leaves the device, and inbound connections are blocked at the loopback interface (`127.0.0.1`).
- **2-of-2 Hardware Separation (Threshold DH)**: The Owner Key (`user-key.bin`) and Heir Key (`heir-key.bin`) are mathematically orthogonal. Neither party alone can compute the master key. Both physical devices must be plugged into the machine simultaneously to derive the AES-256-GCM session key.
- **Convenient Daily Usage vs. Secure Posthumous Succession**: The owner uses a **Master PIN** for daily management on their PC without needing to constantly carry USB drives. The dual-USB mechanism is reserved for offline disaster recovery and posthumous execution.
- **Heir Read-Only Mode**: When the heir activates the vault posthumously, the software enters an enforced read-only view, prohibiting any modification or deletion to preserve legal authenticity.

---

### 2. Dual-USB Cryptographic Architecture

```text
               ┌─────────────────────────────────────────────────────────────┐
               │         LegacyLock 2-of-2 Hardware Key Separation           │
               └─────────────────────────────────────────────────────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
            【Owner Drive A】                             【Heir Drive B】
           user-key.bin (64B)                            heir-key.bin (64B)
         (X25519 Secret + Public)                      (X25519 Secret + Public)
         Kept in Owner's Home Safe                     Held by Legal Heir / Escrow
                       │                                             │
                       ├──────────────────────┬──────────────────────┤
                       ▼                      ▼                      ▼
               【Single Drive A】     【Single Drive B】    【Simultaneous Insertion A + B】
                 Cannot Decrypt         Cannot Decrypt        Curve25519 Diffie-Hellman Exchange
                (Missing Key B)        (Missing Key A)       DH(A_priv, B_pub) == DH(B_priv, A_pub)
                                                                     │
                                                                     ▼
                                                             PBKDF2-HMAC-SHA256
                                                            (100,000 Iterations)
                                                                     │
                                                                     ▼
                                                            AES-256-GCM Decryption
                                                            (Input Heir PIN -> Vault Unlocked!)
```

---

### 3. Key Feature Matrix

| Feature Domain | Implementation & Defense Mechanism |
| :--- | :--- |
| **Tri-lingual i18n (EN/ZH/JA)** | Native real-time language switching across **English (Default)**, **简体中文**, and **日本語** with zero third-party bloat and cross-session persistence. |
| **Responsive Display & Zoom** | Automatic screen adaptation: auto-maximizes on compact laptop screens (< 1366x768), strictly adheres to `800x500` minimum bounds, and supports global zoom scaling (`Ctrl + + / - / 0`, wheel zoom, and UI slider). |
| **12 Asset Categories** | Structured fields for Logins, Notes, Identity, Banking Cards, Master Passwords, Legal Documents, SSH Keys, API Tokens, Crypto Wallets, Servers, Routers, and Memberships. |
| **CSPRNG Password Generator** | Generates 20-character military-grade passwords using `window.crypto.getRandomValues` with unbiased rejection sampling (CWE-338 eliminated). |
| **Air-Gapped CSP & Zero Telemetry** | Strict Content Security Policy blocks any external network traffic. External fonts replaced with native system font stacks. Zero `fetch` / `axios` calls. |
| **Lock Screen Protection** | Global idle timer triggers a full-screen frosted glass lock screen after inactivity (5~60 min). Top-bar one-click **Lock Screen** button for immediate departure security. |
| **30-Second Clipboard Purge** | Copying passwords or seed phrases automatically arms a 30-second destruction timer, silently wiping the system clipboard to thwart malware sniffing. |
| **Zero Footprint Cold Mode** | Owners who share PCs can wipe local LevelDB cache (`ERASE-ALL`), storing assets exclusively on Drive A. Eject the drive, and the computer is 100% clean. |
| **Universal Media Support** | Scans external USB Flash drives, USB External HDDs, and USB SSDs across Windows (including `D:\`), macOS (`/Volumes`), and Linux (`lsblk`). |
| **Ultra-Lightweight Binary** | Highly optimized packaging: ~63MB single-file portable executable & NSIS installer, with the native Rust cryptographic core stripped to ~500KB and zero zombie processes on exit. |
| **3-Month Free Trial & Soft Grace** | Includes a full-featured 3-month free trial. Expiration never locks your data; existing credentials remain 100% viewable, copyable, and exportable forever. |

---

### 4. Quick Start Guide

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or later)
- [Rust & Cargo](https://www.rust-lang.org/) (Optional, for building native Rust cryptographic CLI)

#### Installation & Launch
```bash
# 1. Clone repository
git clone https://github.com/vicky-clair/military-grade-digital-heritage-vault-LegacyLock.git
cd military-grade-digital-heritage-vault-LegacyLock

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Launch native Electron desktop client
npm run electron

# Windows one-click batch launcher:
.\启动LegacyLock.bat

# 5. Out-of-the-box Windows Binaries (Zero npm/Node prerequisite):
# - Standalone Portable EXE (~63MB): release/LegacyLock-v1.0.0-Windows-Portable.exe
# - Unpacked Directory: release/win-unpacked/LegacyLock.exe
# - NSIS Setup Installer (~63MB): release/LegacyLock Setup 1.0.0.exe
```

#### Production Packaging
```bash
# Build frontend web production bundle:
npm run build

# Package Windows installer & portable binaries:
npm run dist:win

# Package Linux tarball:
npm run dist:linux
```

---

<div id="-中文-chinese"></div>

## 🇨🇳 中文 (Chinese)

### 1. 项目愿景与设计哲学

在数字化时代，助记词、私钥、银行凭证与商业机密高度碎片化。中心化云端密码库存在单点被攻破或服务商跑路的风险；纯本地明文存储又无法在身后安全交付给法定继承人。

**LegacyLock 军规遗产密钥库** 专为跨世代（30 年+）数字遗产安全保管而生：
- **100% 纯离线冷存储（Air-Gapped）**：绝不发起任何网络请求，内嵌服务仅绑定 `127.0.0.1` 本机环回接口，外网进不来，数据出不去；
- **双钥匙物理隔离（2-of-2 Threshold）**：所有者钥匙（`user-key.bin`）与继承人钥匙（`heir-key.bin`）在数学上严格正交。单持任何一方在数学上绝无破解可能，必须身后双盘同时接入方可解密；
- **生前日常便捷 vs. 身后接管安全**：所有者在自己电脑上使用 **Master PIN** 与本地 AES-256 密文库，日常无需翻找 U 盘；双 U 盘作为物理冷存与身后钥匙隔离保管；
- **继承人单向只读接管**：继承人解锁后自动进入只读模式，允许查阅与复制，但严禁修改与删除，捍卫数字遗产法律真实性。

---

### 2. 核心功能亮点

1. **三语原生国际化 (English / 简体中文 / 日本語)**：默认英文界面，支持在设置中毫秒级无损切换中、英、日三语，且设置跨会话永久保存；
2. **屏幕自适应与全自由缩放 (Display & Zoom Adaptation)**：小屏笔记本 (< 1366x768) 自动最大化防截断；保底 `800x500` 最小窗口尺寸；支持 `Ctrl + + / - / 0`、滚轮及设置滑块全局缩放；
3. **12 大维度数字资产管理**：支持账号登录、安全便签、身份信息、银行金融、独立密码、加密文档、SSH私钥、API凭据、加密冷钱包、服务器数据库、路由器和会员资产；
4. **真随机数密码发生器 (CSPRNG)**：基于底层内核高熵安全随机源与拒绝采样算法生成 20 位军规口令；
5. **全屏防暂离锁屏**：无操作超时自动全屏模糊锁定，强制验证 Master PIN 唤醒，顶部常驻一键「立即锁屏」；
6. **30 秒敏感剪贴板自毁**：复制密码或助记词后自动挂载 30s 销毁定时器，超时主动清空剪贴板，防止木马嗅探；
7. **全平台外部存储识别**：原生兼容 USB 闪存盘、USB 移动机械硬盘 (HDD) 与移动固态 (SSD)，完美支持 Windows（含 `D:\` 盘及后续盘符）、macOS 与 Linux；
8. **极致轻量化打包 (~63MB)**：Rust 原生密码内核体积剥离优化至仅 ~500KB，桌面便携版与安装包仅约 63MB，退出时 0 孤儿进程残留；
9. **3 个月免费试用与柔性权益保障**：开箱即享 3 个月全功能免费试用；试用到期绝不扣押用户数据，既有资产 100% 永久安全可查可复制导出。

---

### 3. 两部专属实操手册导读

- [👤 **所有者使用手册 (USER_MANUAL.md)**](./USER_MANUAL.md)：资产录入、双密码配置（Master PIN vs Heir PIN）、制作双 U 盘、纯冷存物理模式（电脑不存数据）、介质健康自检与纸质留档单封存；
- [🗝️ **法定继承人接管手册 (HEIR_MANUAL.md)**](./HEIR_MANUAL.md)：三大凭证核对（副盘B、主盘A、Heir PIN）、免安装便携版运行、双盘插机联合激活、只读接管实操与区块链/金融资产落地转移指引；
- [⚖️ **所有者与继承人权限全景对照 (OWNER_VS_HEIR_PERMISSIONS.md)**](./OWNER_VS_HEIR_PERMISSIONS.md)：系统各操作权限的逐项对照与双密码认证提升逻辑。

---

<div id="-日本語-japanese"></div>

## 🇯🇵 日本語 (Japanese)

### 1. プロジェクト概要と設計思想

デジタル時代において、暗号資産のシードフレーズ、秘密鍵、銀行口座、サーバー認証情報は分散して保管されています。一般的なクラウド型パスワードマネージャーは、サーバー侵入やサービス終了のリスクを抱えており、プレーンテキストでのローカル保存は生前漏洩や相続トラブルの原因となります。

**LegacyLock（ミリタリーグレード・デジタル遺産保管庫）** は、世代を超えた長期（30年以上）の安全なデジタル遺産継承を実現するために設計されました：
- **100% 完全オフライン（エアギャップ）**：インターネット接続は一切行いません。内部サーバーは `127.0.0.1`（ローカルループバック）にのみバインドされ、外部ネットワークからの侵入やデータ流出を完全に遮断します。
- **2-of-2 ハードウェア完全分離**：所有者キー（`user-key.bin`）と相続人キー（`heir-key.bin`）は暗号学的に直交しています。単一のUSBだけでは数学的に復号不可能であり、死後に両方のUSBを同時に接続することでのみ資産をアンロックできます。
- **日常の利便性と死後の高安全性の両立**：所有者は日常PC上で **Master PIN** を使って便利に管理でき、普段から2本のUSBを接続し続ける必要はありません。USBキーは金庫での物理保管および死後相続のために使用します。
- **相続人専用の読み取り専用モード**：相続人がアンロックした後は、誤操作や改ざんを防止するため「読み取り専用ビュー」に切り替わり、確実な法的資産保全を行います。

---

### 2. 主な機能とセキュリティ仕様

| 機能カテゴリ | セキュリティ仕様と防御メカニズム |
| :--- | :--- |
| **多言語UI対応 (英語/日本語/中国語)** | 英語（初期設定）、日本語、簡体字中国語をネイティブサポート。設定画面から即座に切り替え可能で、再起動後も設定を維持。 |
| **画面解像度自動適応 & UIズーム** | 低解像度ラップトップ（< 1366x768）での自動最大化。最小ウィンドウサイズ `800x500` の厳格な保持。`Ctrl + + / - / 0`、マウスホイール、スライダーによる自由なUI拡大縮小。 |
| **12種類の資産管理** | ログイン情報、メモ、個人識別、銀行口座、パスワード、暗号化文書、SSH鍵、APIトークン、暗号資産ウォレット、サーバー、ルーター、会員権。 |
| **暗号学的に安全な乱数生成器 (CSPRNG)** | `window.crypto.getRandomValues` と拒絶サンプリング法を用いて、予測不能な20桁の高強度パスワードを生成。 |
| **自動スクリーンロック** | 一定時間操作がない場合、高密度ガウスぼかしスクリーンロックが作動。トップバーの「今すぐロック」ボタンで即座に離席保護。 |
| **30秒クリップボード自動消去** | パスワードや秘密鍵をコピーした後、30秒後に自動的にクリップボードをクリアし、マルウェアによる盗聴を防止。 |
| **ゼロ・フットプリント（完全コールドモード）** | 家族とPCを共有している場合、ローカルデータを消去し、Drive A のみに保存可能。USBを抜けばPC上に痕跡は一切残りません。 |
| **クロスプラットフォーム対応** | Windows（`D:\` ドライブを含む全ドライブ）、macOS、Linux でのUSBフラッシュメモリ、外付けHDD/SSDの自動検出に対応。 |
| **超軽量バイナリ最適化 (~63MB)** | Rust 暗号化コアを約500KBまで極限ストリップ。ポータブル実行ファイル・インストーラーは約63MBの超軽量設計。終了時のゾンビプロセス残存ゼロ。 |
| **3ヶ月無料トライアル & 恒久閲覧保証** | 3ヶ月の無料トライアル付き。トライアル終了後も既存データは一切ロックされず、いつでも閲覧・コピー・エクスポートが可能。 |

---

### 3. 公式マニュアル案内

- [👤 **所有者向け利用マニュアル (USER_MANUAL.md)**](./USER_MANUAL.md)：資産登録、デュアルPIN設定（Master PIN / Heir PIN）、デュアルUSB作成、完全コールドモード運用、ペーパーバックアップ手順。
- [🗝️ **相続人向け継承マニュアル (HEIR_MANUAL.md)**](./HEIR_MANUAL.md)：必須3大要素の確認（副USB B、主USB A、Heir PIN）、ポータブル版の起動、デュアルUSB同時接続による復号、暗号資産移行ガイド。
- [⚖️ **権限・機能対照表 (OWNER_VS_HEIR_PERMISSIONS.md)**](./OWNER_VS_HEIR_PERMISSIONS.md)：所有者と相続人の権限分離、読み取り専用保護、および権限昇格認証ルール。

---

## 📂 项目结构概览 / Project Structure / プロジェクト構成

```text
xr-LegacyLock/
├── crypt/                   # Rust 密码学核心工程 (X25519, AES-256-GCM, CLI)
├── electron/                # Electron 桌面原生主进程与跨平台驱动器探查引擎
│   ├── main.cjs             # Windows/macOS/Linux 外接硬盘扫描、路径安全与配置持久化
│   └── preload.cjs          # 安全 IPC 桥接层
├── src/                     # React 19 + TypeScript 前端渲染层
│   ├── components/          # 视图组件 (CategoryPicker, ItemModal, LockScreen, SettingsView等)
│   ├── services/            # 密码学调用、剪贴板自毁、主题规范、数据模型、i18n 多语言引擎
│   ├── types/               # 接口规范与 LVCF 2.0 数据结构
│   ├── App.tsx              # 应用状态编排、空闲锁屏监听、UI 缩放与自适应
│   └── index.css            # 现代军规设计系统、中文字体栈与样式
├── USER_MANUAL.md           # 所有者日常管理与安全配置手册 (Owner Manual)
├── HEIR_MANUAL.md           # 法定继承人身后接管与解密指南 (Heir Manual)
├── OWNER_VS_HEIR_PERMISSIONS.md # 所有者与继承人权限与功能对照表 (Permissions Matrix)
├── DEVELOPMENT.md           # 详细技术架构与军规安全审计报告 (Dev & Audit Report)
├── README.md                # 本开源主文档 (Multi-language Document)
└── 启动LegacyLock.bat       # Windows 桌面一键启动脚本
```

---

## 📄 开源许可证与安全申明 / License & Disclaimer

- **License**: Released under the [MIT License](./LICENSE).
- **Disclaimer**: LegacyLock operates strictly on an offline cold storage model with zero cloud dependencies and no backdoors. Always safeguard your physical storage media and backup credentials, adhering to the "Dual-Device Geographic Redundancy" policy. Loss of physical media without backup will result in mathematically irreversible asset loss.
