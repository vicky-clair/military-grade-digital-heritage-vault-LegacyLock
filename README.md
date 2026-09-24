# LegacyLock 军工级数字遗产密库 (v1.0.6)

LegacyLock 是一款面向高价值数字资产传承与保管的本地端加密密库应用。采用 **LVCF 3 (LegacyLock Vault Container Format v3)** 协议标准，通过军工级现代密码学、双物理 U 盘协同恢复与操作系统底层安全存储，提供兼顾日常易用性与终极灾难备份的数字资产保管方案。

---

## 🌟 核心安全与架构特性

### 1. 军工级现代密码学体系 (LVCF 3)
* **抗量子/抗暴力破解 KDF**：采用标准 `scrypt` 算法（固定参数 $N=32768, r=8, p=1$），对主口令与 256 位安全密钥进行多重拉伸与内存硬化派生，有效阻断 GPU/ASIC 离线彩虹表破解。
* **AEAD 认证加密**：主载荷与元数据采用 `AES-256-GCM` 算法加密；计算附加认证数据（AAD），强绑定密库 ID、签名公钥、修订版本号及操作阶段标签，杜绝跨信封重放与剪切拼接攻击。
* **非对称抗篡改数字签名**：每个密库在初始化时由系统内核级 CSPRNG 独立生成专有的 `Ed25519` 签名密钥对。信封整体受私钥数字签名保护，任何字节被物理篡改均会触发验签失败并硬拒绝加载（Fail-Closed）。
* **内存零化防转储 (Zeroization)**：密钥材料及解密缓冲区在使用完毕后立即显式调用 `.fill(0)` 擦除，杜绝凭据残留于内存堆栈。

### 2. 双物理 U 盘只读继承恢复 (2-of-2 Hardware Recovery)
* **无单点泄露风险**：基于 `HKDF-SHA256` 算法将两块独立硬件 U 盘上的随机秘密（主盘 `primary.llkey` 与副盘 `secondary.llkey`）合并派生恢复密钥。单盘丢失或单盘持有者无法解密任何数据。
* **物理防伪与真伪校验**：两份恢复凭据均带有所有者的 Ed25519 数字签名与代次（Generation）锁定；物理设备枚举强制校验磁盘物理序列号，严禁同一物理盘的不同分区充当双盘。
* **只读隔离与防伪造**：继承人通过双盘恢复后进入 `HEIR` 会话，界面受控只读，且恢复会话**不包含签名私钥**，在密码学层面彻底杜绝了继承人篡改或伪造密库数据的可能。

### 3. 操作系统级安全密钥托管 (OS SafeStorage)
* **系统硬件级安全集成**：支持通过操作系统底层安全存储（Windows DPAPI、macOS Keychain、Linux Secret Service）在本机受保护保存安全密钥。
* **密码学双向绑定**：本地凭据存储深度绑定当前信封 ID、所有者公钥及主凭据包装哈希。一旦所有者更换口令或轮换密钥，旧本地绑定立即失效并自动物理删除。
* **双因子基本原则不妥协**：即使开启本机记住密钥，解锁仍必须校验所有者主口令，绝无“免密直登”后门。

### 4. 离线沙箱与断网防护
* **模拟物理断网 (Air-Gap Simulation)**：渲染进程完全运行于隔离沙箱环境中，主进程网络层强制拦截一切外部 HTTP/HTTPS/WebSocket 请求。
* **剪贴板定时安全擦除**：复制密码等敏感信息后自动启动定时销毁，锁定密库或退出应用时立即清空系统剪贴板。
* **系统事件即时感知**：全天候监听系统锁屏、休眠、挂起事件，第一时间触发密库零化锁定。

---

## 🚀 快速上手与本地开发

### 环境要求
* **Node.js**：`>= 24.16.0 LTS`
* **包管理器**：`npm >= 10.x`
* **运行时引擎**：Electron `44.4.3`

### 安装与运行
```sh
# 1. 安装项目全部依赖
npm ci

# 2. 运行自动化测试套件 (覆盖密码学、双盘恢复、本地密钥等全部用例)
npm test

# 3. 编译 TypeScript 与前端静态资源 (Vite)
npm run build

# 4. 启动 Electron 桌面应用
npm run electron
```

> **Windows 便捷启动**：
> 在已安装依赖的 Windows 环境下，可直接双击运行根目录下的 [`启动LegacyLock.bat`](file:///c:/XMWJJ/xr-LegacyLock/启动LegacyLock.bat) 或在终端执行 `.\启动LegacyLock.ps1`。

---

## 🛡️ 商业发布、安全加壳与安装包制作指南

为防止商业发布时源代码泄露并提升反逆向能力，本项目提供了标准的**工业级加壳与重封包流水线**：

```
源码构建 (npm run build)
          ↓
解包生成 64 位原生主程序 (npm run dist:unpack)
          ↓ 产出 release\win-unpacked\LegacyLock.exe
使用加壳工具 (VMProtect / Themida / Virbox) 对 64 位 EXE 加壳保护
          ↓ 加壳后覆盖回原位置
二次封包 (npm run dist:repack 或 Inno Setup)
          ↓
产出最终对外分发的商业安装包 (release\LegacyLock Setup 1.0.6.exe)
```

### 操作步骤：
1. **生成 64 位解包原生程序目录**：
   ```powershell
   npm run dist:unpack
   ```
   该指令会自动编译前端并在 `release\win-unpacked\` 下生成纯正 64 位（PE32+ / x86_64）的 [`LegacyLock.exe`](file:///c:/XMWJJ/xr-LegacyLock/release/win-unpacked/LegacyLock.exe)。

2. **执行商业加壳保护**：
   * 将 `release\win-unpacked\LegacyLock.exe` 载入加壳软件（如 **VMProtect、Themida、Virbox Protector**）；
   * 勾选 64 位保护、代码虚拟化与反调试；
   * **注意**：请保留应用程序的 `.rsrc` 资源段，确保图标与版本信息完好；
   * 将加壳后的文件保存覆盖原有的 `release\win-unpacked\LegacyLock.exe`。

3. **一键封装商业安装包**：
   * **方式 A（项目原生 NSIS 方案）**：
     ```powershell
     npm run dist:repack
     ```
     命令将基于加壳后的目录直接打包，在 `release\` 目录下输出最终的单文件安装包：
     👉 **`release\LegacyLock Setup 1.0.6.exe`**
   * **方式 B（企业级 Inno Setup 方案）**：
     右键编译项目内置的 [`scripts/installer.iss`](file:///c:/XMWJJ/xr-LegacyLock/scripts/installer.iss) 脚本，生成高度可定制的商业安装包。

---

## 📁 核心架构与代码索引

| 路径 | 核心职责说明 |
| :--- | :--- |
| [`electron/vault-core.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/vault-core.cjs) | **LVCF 3 唯一密码学实现**：scrypt 派生、AES-256-GCM、Ed25519 签名、双盘 HKDF 恢复。 |
| [`electron/vault-store.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/vault-store.cjs) | **持久化存储与原子 I/O**：临时文件、强制 fsync、读回校验、上一快照备份 (.previous)、串行锁。 |
| [`electron/vault-controller.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/vault-controller.cjs) | **设备编排与业务控制器**：真实物理 USB 扫描绑定、双盘恢复逻辑、凭据轮换与彻底销毁。 |
| [`electron/vault-local-key.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/vault-local-key.cjs) | **本机安全存储**：系统 safeStorage (DPAPI/Keychain) 交互，密码学哈希绑定与自动失效机制。 |
| [`electron/vault-media.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/vault-media.cjs) | **物理存储介质抽象**：真实硬件盘符与序列号探测，防同盘多卷冒充。 |
| [`electron/main.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/main.cjs) | **Electron 主进程生命周期**：单实例锁、系统托盘、剪贴板自动销毁、网络拦截、锁屏感知。 |
| [`electron/preload.cjs`](file:///c:/XMWJJ/xr-LegacyLock/electron/preload.cjs) | **安全 IPC 上下文桥接**：白名单方法冻结暴露，上下文隔离。 |
| [`scripts/recovery-reader.cjs`](file:///c:/XMWJJ/xr-LegacyLock/scripts/recovery-reader.cjs) | **独立离线恢复阅读器**：零外部依赖的终端脚本，支持通过双盘离线导出明文 JSON。 |
| [`scripts/installer.iss`](file:///c:/XMWJJ/xr-LegacyLock/scripts/installer.iss) | **商业级 Inno Setup 脚本**：加壳后发布目录的单文件安装包制作脚本。 |

---

## 📖 配套技术文档

* 📘 [所有者实操手册](USER_MANUAL.md)：密库初始化、资产录入、安全密钥备份、两盘配置与日常管理。
* 📙 [继承人操作手册](HEIR_MANUAL.md)：双盘只读模式访问、异机抢救、独立离线阅读器使用指南。
* 📑 [权限安全对照表](OWNER_VS_HEIR_PERMISSIONS.md)：所有者与继承人权限边界矩阵。
* 🛠️ [开发、迁移与灾备文档](DEVELOPMENT.md)：底层架构剖析、回归测试流程、故障恢复与灾备规范。
* 📐 [LVCF 3 协议技术白皮书](LVCF3_PROTOCOL.md)：容器物理结构、字段定义与密码学规范明细。

---

## 📜 许可与法律免责声明

本项目遵循开源协议发布。软件按“原样”提供，不提供任何明示或暗示的担保。由于数字遗产具有不可逆的特殊性，请务必遵循操作手册妥善异地保管双物理 U 盘与核心凭据，避免因介质物理损坏或凭据丢失导致资产无法恢复。
