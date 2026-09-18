# LegacyLock v2 数字遗产保险库开发文档

**文档版本：** 2.0
**项目名称：** LegacyLock
**中文暂定名：** 数字遗产保险锁 / 数字遗产保险库
**文档状态：** 架构设计阶段
**目标平台：** Windows / macOS / Linux
**核心开发语言：** Rust + TypeScript
**核心设计目标：** 安全、长期可读、离线可恢复、介质无关、权限隔离、算法可迁移

------

# 1. 项目概述

LegacyLock 是一款面向长期数字资产保存与继承场景设计的数字遗产保险库。

其主要目标不是单纯保存密码，而是解决：

- 用户死亡、失能或长期无法访问设备后，数字资产如何安全移交；
- 在用户仍然正常使用期间，继承人无法提前访问或篡改资产；
- 数字遗产保存十年、二十年甚至更长时间后，仍然能够读取；
- LegacyLock 公司、服务器甚至产品本身未来不存在时，仍然可以离线恢复；
- 存储设备可以由普通 U 盘升级为移动 SSD、移动硬盘等，而不破坏原有保险库；
- 密码算法升级后，旧保险库仍可继续读取或安全迁移。

LegacyLock 不把“U盘”作为产品架构的一部分，而把它抽象为：

**Removable Secure Media —— 可移动安全介质。**

因此以下设备原则上均可作为 LegacyLock 介质：

- USB U盘；
- USB-C U盘；
- 移动 SSD；
- 移动 HDD；
- NVMe 移动硬盘盒；
- SD 卡；
- microSD 卡；
- USB 读卡器中的存储卡；
- 后续支持的其它可移动存储设备。

------

# 2. 核心设计理念

LegacyLock 使用两种不同角色的安全介质：

## 2.1 Owner Media

中文：

**主介质 / 所有者介质**

以下简称：

```
Owner Media
```

由数字资产所有者长期持有。

主要负责：

- 保存保险库；
- 保存 Owner Key Slot；
- 修改数字资产；
- 删除数字资产；
- 新增数字资产；
- 更新继承计划；
- 更新保险库格式；
- 更新密码算法；
- 发行新的继承介质；
- 吊销旧继承介质；
- 重新生成恢复资料。

Owner Media 是：

**Read + Write + Administration**

权限介质。

------

# 3. Heir Media

中文：

**继承介质 / 副介质**

以下简称：

```
Heir Media
```

由继承人或受托人保管。

Heir Media 不承担数字资产日常维护职责。

其唯一主要用途是：

> 当继承条件满足后，与 Owner Media 配合进入 LegacyLock Recovery Mode。

Heir Media 权限原则：

**Recovery + Read Only**

可以：

- 解锁继承模式；
- 查看数字资产；
- 查看安全笔记；
- 查看账号；
- 查看软件授权信息；
- 查看附件；
- 搜索；
- 复制账号、密码、密钥；
- 导出允许导出的数字资产；
- 将资产迁移到继承人自己的新保险库。

不允许：

- 修改原保险库；
- 删除原保险库项目；
- 增加项目；
- 修改项目；
- 修改继承人；
- 修改继承规则；
- 修改保险库配置；
- 重新生成 Owner Media；
- 重新生成其它 Heir Media；
- 更换主密钥；
- 修改审计记录。

------

# 4. 两种工作模式

LegacyLock 不应该让所有者日常管理时也必须取得继承人介质。

因此设计为两个完全独立的工作模式。

------

## 4.1 Owner Mode

所有者正常使用 LegacyLock。

认证条件：

```text
Owner Media
+
Master Password
+
可选设备认证
```

例如：

```text
Owner Media
+
Master Password
+
Windows Hello / Touch ID
```

认证成功：

```text
OWNER MODE
```

权限：

```text
READ
WRITE
CREATE
DELETE
UPDATE
EXPORT
REKEY
MIGRATE
ISSUE_HEIR
REVOKE_HEIR
BACKUP
RECOVERY_CONFIG
```

------

# 5. Heir Recovery Mode

继承人执行数字遗产接管。

基本条件：

```text
Owner Media
+
Heir Media
```

必要时增加：

```text
+
继承条件验证
```

成功后进入：

```text
HEIR RECOVERY MODE
```

权限：

```text
READ
SEARCH
COPY
EXPORT
RECOVER
```

禁止：

```text
WRITE
UPDATE
DELETE
REKEY
ISSUE
REVOKE
ADMIN
```

------

# 6. 权限模型

LegacyLock 必须采用密码学权限模型。

不能依赖：

- Windows 文件只读属性；
- NTFS ACL；
- FAT/exFAT 权限；
- Linux chmod；
- U盘写保护属性。

原因：

继承人拥有物理介质以后，可以使用其它软件直接修改磁盘内容。

例如：

```text
Hex Editor
PowerShell
Python
Linux dd
磁盘编辑工具
自定义程序
```

因此必须保证：

> 即使用户能够修改磁盘文件，也无法生成合法的新保险库版本。

------

# 7. 数字签名保护

每次 Owner 修改保险库后：

```text
Data Changed
      ↓
Create New Manifest
      ↓
Calculate Object Hashes
      ↓
Owner Signing Private Key
      ↓
Sign Manifest
      ↓
Commit
```

读取时：

```text
Load Manifest
      ↓
Verify Signature
      ↓
Verify Object Hash
      ↓
Verify Sequence Number
      ↓
Accept Vault
```

如果继承人自行修改文件：

```text
manifest signature invalid
```

LegacyLock 必须拒绝将其视为有效保险库。

因此：

**Heir Media 没有 Owner Signing Private Key。**

即使继承人能够物理写入存储设备，也不能制造合法版本。

------

# 8. 介质抽象层

新增模块：

```text
Storage Media Abstraction Layer
```

简称：

```
SMAL
```

应用层不得直接写：

```text
USB Drive
```

而应该使用：

```text
SecureMedia
```

接口示例：

```rust
pub trait SecureMedia {
    fn media_id(&self) -> MediaId;

    fn media_type(&self) -> MediaType;

    fn mount_path(&self) -> PathBuf;

    fn capacity(&self) -> u64;

    fn filesystem(&self) -> FileSystemType;

    fn removable(&self) -> bool;

    fn writable(&self) -> bool;

    fn health_status(&self) -> MediaHealth;

    fn read(&self, path: &VaultPath) -> Result<Vec<u8>>;

    fn write(&self, path: &VaultPath, data: &[u8]) -> Result<()>;
}
```

MediaType：

```rust
enum MediaType {
    UsbFlash,
    UsbSSD,
    UsbHDD,
    NvmeEnclosure,
    SDCard,
    MicroSD,
    OtherRemovable,
}
```

保险库不能依赖某个具体厂商的 U 盘序列号才能恢复。

设备序列号可以作为辅助信息：

```text
Device Hint
```

但不能作为唯一密码学认证依据。

------

# 9. LegacyLock 文件标准

新增长期文件标准：

# LVCF

全称：

**LegacyLock Vault Container Format**

------

## 9.1 设计目标

LVCF 必须满足：

1. 长期可读；
2. 版本可识别；
3. 向前迁移；
4. 旧版本兼容；
5. 算法可升级；
6. 不依赖数据库服务器；
7. 不依赖 LegacyLock 云服务器；
8. 支持完整性验证；
9. 支持数字签名；
10. 支持多个 Key Slot；
11. 支持未来新的加密算法；
12. 支持未知字段安全忽略；
13. 文档公开。

------

# 10. 文件目录结构

建议：

```text
LEGACYLOCK/
│
├── legacylock.header
│
├── vault/
│   ├── manifest.enc
│   └── objects/
│       ├── 00/
│       ├── 01/
│       ├── 02/
│       └── ...
│
├── keyslots/
│   ├── owner/
│   │   └── owner.ks
│   │
│   └── heirs/
│       ├── heir-001.ks
│       └── heir-002.ks
│
├── signatures/
│   ├── manifest.sig
│   └── root.sig
│
├── audit/
│   └── audit.enc
│
├── recovery/
│   └── recovery.meta
│
└── compatibility/
    └── format.info
```

------

# 11. Header

`legacylock.header` 中不得保存数字资产明文。

允许保存：

```json
{
  "magic": "LEGACYLOCK",
  "container": "LVCF",
  "format_version": "1.0",
  "minimum_reader_version": "1.0",
  "vault_id": "UUID",
  "role": "OWNER",
  "sequence": 152,
  "created_at": "UTC_TIME",
  "updated_at": "UTC_TIME",
  "cipher_suite": "LLCS-1"
}
```

禁止保存：

```text
账号名称
网站用户名
密码
银行卡号
身份证号
私钥
恢复码
数字资产名称
备注
附件名称
```

这些内容必须位于加密区域。

------

# 12. Vault ID

每个保险库随机生成：

```text
VaultId = UUIDv7 / 128-bit random identifier
```

Vault ID 只用于标识保险库。

不能作为：

- 密钥；
- 密码；
- Salt 替代品。

------

# 13. 数据模型

建议第一版支持：

```text
Login
Secure Note
Software License
Game Account
Email Account
Social Account
Cloud Service
Crypto Recovery Information
Identity
Payment Information
Document
Attachment
Custom Item
```

统一基础结构：

```rust
struct VaultItem {
    id: ItemId,

    item_type: ItemType,

    title: String,

    fields: Vec<Field>,

    notes: Option<String>,

    attachments: Vec<AttachmentRef>,

    created_at: Timestamp,

    updated_at: Timestamp,

    revision: u64,
}
```

------

# 14. 软件授权数据

针对你后续保存购买软件、注册码等场景，可以专门提供：

```text
Software License
```

字段：

```text
Software Name
Vendor
Official Website
License Type
License Key
Purchase Email
Purchase Date
Order Number
Activation Limit
Download URL
Installer Hash
Notes
Attachment
```

------

# 15. 数字产品继承数据

例如：

```text
Steam
Epic
Microsoft
Adobe
JetBrains
游戏账号
域名
服务器
NAS
云服务
代码仓库
```

可以使用：

```text
Digital Asset
```

模型。

字段：

```text
Asset Name
Service
Account
Password
Recovery Email
Recovery Phone
2FA Recovery Code
Ownership Notes
Inheritance Instructions
Legal Notes
Expiration
Attachments
```

------

# 16. 密钥层级

严禁直接使用：

```text
Master Password
```

加密全部保险库文件。

推荐：

```text
Master Password
      ↓
Argon2id
      ↓
KEK
      ↓
Decrypt Owner Key Slot
      ↓
Vault Master Key
      ↓
HKDF
      ↓
DEK / Metadata Key / Attachment Key
```

------

# 17. Vault Master Key

每个保险库随机产生：

```text
VMK
Vault Master Key
```

例如：

```text
256 bit random
```

VMK 永远不直接写入磁盘。

磁盘中只保存：

```text
Encrypted VMK
```

------

# 18. Key Encryption Key

用户 Master Password 经密码 KDF：

```text
Master Password
+
Random Salt
+
Argon2id
      ↓
KEK
```

KEK：

```text
Key Encryption Key
```

用于解密 Owner Key Slot。

------

# 19. 参数不能写死

例如 Header 应保存：

```json
{
  "kdf": {
    "algorithm": "argon2id",
    "version": 19,
    "memory_kib": 65536,
    "iterations": 3,
    "parallelism": 2,
    "salt": "BASE64"
  }
}
```

实际参数应根据目标设备性能测试确定。

软件必须支持未来提高参数。

------

# 20. 数据加密

建议定义自己的密码套件编号，而不是在业务逻辑里散落算法名称。

例如：

```text
LLCS-1
LegacyLock Cipher Suite 1
```

内部可以定义：

```text
Password KDF:
Argon2id

Key Derivation:
HKDF-SHA-256

Payload Encryption:
XChaCha20-Poly1305

Hash:
SHA-256 / BLAKE3

Signature:
Ed25519
```

具体最终组合应经过安全评审后冻结。

------

# 21. 禁止自行设计密码算法

LegacyLock 可以设计：

```text
协议
文件格式
Key Slot
密钥层级
权限系统
```

但是不得自行发明：

```text
加密算法
Hash 算法
数字签名算法
KDF 算法
```

所有底层密码学必须使用经过成熟验证的标准算法和成熟密码库。

------

# 22. 后量子密码预留

LegacyLock v1 不需要宣传：

```text
量子安全
```

推荐表述：

> LegacyLock 使用成熟现代密码体系，并预留密码算法和后量子密码迁移能力。

文件标准必须允许：

```text
KEM_ID
SIGNATURE_ID
CIPHER_ID
KDF_ID
HASH_ID
```

以后可以从：

```text
X25519
```

升级为：

```text
X25519
+
ML-KEM
```

或其它经过标准化及充分验证的新方案。

------

# 23. 密钥算法迁移

保险库不能因为一个密码算法淘汰就要求用户重新录入所有资产。

设计：

```text
Old Key Slot
       ↓
Unlock VMK
       ↓
New Cipher Suite
       ↓
Create New Key Slot
```

优先使用：

```text
Key Re-Wrapping
```

如果只是 KDF 或 Key Slot 算法升级：

不需要重新加密所有附件。

如果数据加密算法本身升级：

执行：

```text
Full Vault Migration
```

------

# 24. Owner Key Slot

例如：

```text
keyslots/owner/owner.ks
```

包含：

```text
Key Slot Version
KDF Parameters
Encrypted VMK
Owner Public Key
Encrypted Owner Private Key
Capability
Key Generation
Signature
```

Capability：

```text
OWNER
```

------

# 25. Heir Key Slot

例如：

```text
keyslots/heirs/heir-001.ks
```

包含：

```text
Key Slot Version
Heir ID
Recovery Share
Capability
Created At
Expiry
Generation
Public Metadata
Signature
```

Capability：

```text
HEIR_RECOVERY
```

绝对不能包含：

```text
Owner Signing Private Key
```

------

# 26. 多继承人预留

第一版可以只提供：

```text
1 Owner
+
1 Heir
```

但文件结构必须从一开始支持：

```text
1 Owner
+
N Heirs
```

例如：

```text
heir-001
heir-002
heir-003
```

以后可以支持：

```text
妻子
长子
次子
律师
企业受托人
```

------

# 27. Threshold Recovery 预留

未来可增加：

```text
2-of-3
```

例如：

```text
妻子
+
律师
+
子女
```

三个人中任意两人共同恢复。

因此 Recovery Protocol 不应该写死：

```text
必须只有一个 Heir
```

未来可以支持：

```text
Shamir Secret Sharing
```

或者经过安全评审的 Threshold Cryptography。

------

# 28. 继承介质不可修改的实现

“不可修改”含义不是：

```text
磁盘物理不可写
```

而是：

```text
Heir 无法生成合法的新保险库版本。
```

例如：

```text
Original Manifest
Sequence = 100
Signature = VALID
```

继承人修改密码：

```text
Sequence = 101
```

但是没有 Owner Private Key：

```text
Signature = INVALID
```

应用显示：

```text
检测到未经授权的保险库修改。

该数据不是 LegacyLock 所有者签署的有效版本。
```

------

# 29. 防回滚攻击

除了防止非法修改，还必须防止：

```text
把旧保险库覆盖回来
```

例如：

```text
当前：
Sequence 200

攻击者：
恢复 Sequence 120
```

需要：

```text
Monotonic Vault Generation
```

字段：

```text
generation
sequence
previous_manifest_hash
```

形成 Hash Chain：

```text
Manifest 1
   ↓
Manifest 2
   ↓
Manifest 3
   ↓
Manifest 4
```

从而能够检测旧版本替换。

------

# 30. 更新必须使用原子事务

不能直接：

```text
打开 manifest.enc
覆盖写
```

否则写入过程中：

```text
突然断电
拔U盘
系统崩溃
应用崩溃
```

可能破坏整个保险库。

正确流程：

```text
manifest.new
      ↓
write
      ↓
fsync
      ↓
verify
      ↓
rename
      ↓
fsync directory
```

旧数据在新数据完全确认前不能删除。

------

# 31. Write-Ahead Recovery

建议：

```text
transaction/
```

增加事务状态。

例如：

```text
PREPARE
WRITE
VERIFY
COMMIT
CLEANUP
```

程序启动发现：

```text
unfinished transaction
```

必须自动恢复：

```text
rollback
```

或：

```text
finish commit
```

避免保险库损坏。

------

# 32. 介质损坏检查

移动存储设备可能出现：

```text
坏块
文件损坏
静默位翻转
控制器故障
文件系统损坏
```

LegacyLock 应提供：

# Vault Health Check

包括：

```text
Header Verification
Manifest Signature Verification
Object Hash Verification
Attachment Hash Verification
Key Slot Verification
Recovery Slot Verification
```

检查结果：

```text
Healthy
Warning
Damaged
Recovery Required
```

------

# 33. 定期健康提醒

Owner Mode 可以提醒：

```text
该介质已经 12 个月未进行完整性检查。
```

推荐：

```text
每 6～12 个月
```

主动进行：

```text
Verify Vault
```

但时间应允许用户配置。

------

# 34. 备份策略

不能把数字遗产的唯一副本只保存在一个 U盘中。

支持：

```text
Primary Owner Media
Backup Owner Media
```

例如：

```text
Owner Media A
移动 SSD
```

- 

```text
Owner Media B
备用 U盘
```

二者保存的是相同保险库数据，但拥有独立：

```text
Media ID
```

------

# 35. Owner Backup Media

备用 Owner Media 与继承介质不同。

权限：

```text
Owner Backup
```

可以作为：

```text
Owner Media
```

恢复。

但建议再次要求：

```text
Master Password
```

------

# 36. Heir Media 重发

副介质可能：

```text
丢失
损坏
被盗
继承人发生变化
```

Owner Mode 必须支持：

```text
Reissue Heir Media
```

流程：

```text
Owner Authentication
      ↓
Select Old Heir
      ↓
Revoke
      ↓
Generation + 1
      ↓
Create New Heir Key
      ↓
Write New Heir Media
```

------

# 37. Heir Media 吊销

例如：

```text
Heir Generation 3
```

被吊销。

新介质：

```text
Heir Generation 4
```

以后：

```text
Generation 3
```

即使被找到，也不能接管当前保险库。

------

# 38. 更换 Owner Media

用户可以从：

```text
U盘
```

迁移到：

```text
移动 SSD
```

流程：

```text
Unlock Owner Vault
      ↓
Insert New Media
      ↓
Initialize
      ↓
Copy Vault
      ↓
Verify
      ↓
Activate New Media
```

旧介质可以：

```text
保留为 Backup
```

或者：

```text
Secure Revoke
```

------

# 39. 保险库克隆保护

应用发现两份相同：

```text
Vault ID
```

但状态不同：

```text
Sequence 150
Sequence 160
```

应识别：

```text
Sequence 160
```

为较新版本。

如果两份保险库同时被修改形成：

```text
branch
```

不能静默合并。

应该提示：

```text
Vault Fork Detected
```

然后由 Owner 处理。

------

# 40. 继承接管流程

标准流程：

```text
STEP 1
插入 Owner Media

STEP 2
插入 Heir Media

STEP 3
LegacyLock 识别 Vault ID

STEP 4
验证两个介质属于同一保险库

STEP 5
验证 Heir Key Slot

STEP 6
验证是否已吊销

STEP 7
检查继承策略

STEP 8
恢复 VMK

STEP 9
验证 Manifest Signature

STEP 10
加载保险库

STEP 11
进入 HEIR READ ONLY MODE
```

------

# 41. Read Only Recovery UI

进入继承模式后，整个 UI 应明显区别于 Owner Mode。

例如顶部：

```text
LegacyLock Recovery Mode
只读继承模式
```

所有编辑按钮：

```text
隐藏
```

而不是仅：

```text
Disabled
```

主要功能：

```text
查看
搜索
复制
导出
打印
接管指导
```

------

# 42. 数字资产接管向导

可以增加：

# Asset Transfer Assistant

例如：

```text
域名
服务器
邮箱
社交账号
游戏账号
云盘
软件授权
代码仓库
```

用户可以给每项资产写：

```text
Inheritance Instructions
```

例如：

```text
该服务器位于 XXX。

SSH 私钥在附件中。

域名托管于 XXX。

请先续费域名，再修改管理员邮箱。
```

这类说明对数字遗产非常重要。

------

# 43. 原始保险库不可改变

继承成功后，推荐：

```text
Original Legacy Vault
```

保持只读。

继承人需要继续管理：

```text
Export
       ↓
Create New Personal Vault
       ↓
Import
```

例如：

```text
父亲 Legacy Vault

        ↓

只读保存

        ↓

儿子 New Owner Vault
```

这样可以保留原始数字遗产记录。

------

# 44. Offline Recovery

这是 LegacyLock 的核心设计之一。

必须满足：

> 即使 LegacyLock 公司已经不存在，保险库仍然能够恢复。

因此核心解密不能强制依赖：

```text
LegacyLock Server
DNS
Cloud API
Subscription Server
Firebase
Supabase
互联网
```

最低恢复条件：

```text
Owner Media
+
Heir Media
+
LegacyLock Recovery Reader
```

------

# 45. Recovery Reader

建议独立开发：

```text
LegacyLock Recovery Reader
```

特点：

```text
Open Source
Read Only
No Cloud Requirement
Minimal Dependencies
Long Term Support
```

功能：

```text
Read LVCF
Verify Signature
Unlock Recovery
View Assets
Export Assets
```

不提供：

```text
Edit
Rekey
Issue Heir
Cloud
Account Login
```

------

# 46. Recovery Reader 长期保存

Owner Media 可以附带：

```text
/recovery-reader/
```

例如：

```text
windows-x64/
linux-x64/
linux-arm64/
macos-arm64/
source/
README.txt
FORMAT-SPEC.pdf
```

但是：

> 内置 Reader 只能作为便利工具，不能成为唯一恢复方式。

因为几十年以后当前二进制可能无法运行。

所以必须同时公开：

```text
LVCF Specification
```

------

# 47. 开放文件格式

推荐公开：

```text
LegacyLock Vault Container Format Specification
```

即使主软件闭源，也应考虑将：

```text
格式规范
Recovery Reader
```

开放。

这样如果未来 LegacyLock 项目停止维护：

第三方仍可以：

```text
实现 Reader
```

恢复数据。

------

# 48. Company Disappearance Test

每一个架构决策都必须通过：

# Company Disappearance Test

问题：

> 如果 LegacyLock 公司明天永久关闭，这个保险库还能否恢复？

如果答案是：

```text
必须连接我们的服务器
```

则该设计不能成为唯一恢复路径。

------

# 49. 服务器职责

服务器应该属于：

```text
Coordination Layer
```

而不是：

```text
Root of Trust for Decryption
```

服务器可以负责：

```text
账户
设备列表
继承计划状态
通知
延迟释放
Dead Man Switch
审计同步
版本更新
吊销同步
可选云备份
```

不能成为：

```text
唯一解密密钥提供者
```

------

# 50. 在线继承验证

高级模式可以增加：

```text
Online Inheritance Verification
```

例如：

```text
Owner 长期未确认
        ↓
Server 向 Owner 发送通知
        ↓
等待 30 / 60 / 90 天
        ↓
进入 Recovery Pending
```

Owner 可以：

```text
Cancel
```

------

# 51. Dead Man Switch

可选功能：

```text
每 N 个月确认一次
```

例如：

```text
6 个月
```

长期没有确认：

```text
服务器开始继承流程
```

但必须防止：

```text
用户没网
邮箱失效
旅行
住院
忘记确认
```

造成错误启动。

因此需要多阶段确认。

------

# 52. Dead Man Switch 状态机

例如：

```text
ACTIVE
   ↓
MISSED_CHECKIN
   ↓
WARNING
   ↓
SECOND_WARNING
   ↓
RECOVERY_PENDING
   ↓
RECOVERY_AVAILABLE
```

Owner 在最后一步前都可以：

```text
Cancel Recovery
```

------

# 53. 离线模式与在线模式

LegacyLock 可以提供两类继承策略：

## Offline Only

```text
Owner Media + Heir Media
```

不依赖服务器。

适合：

```text
最高长期可靠性
```

------

## Managed Recovery

增加：

```text
LegacyLock Server
```

负责：

```text
Delay
Notification
Status
Dead Man Switch
```

但最终仍应保留：

```text
Offline Disaster Recovery
```

------

# 54. 本地数据库

LegacyLock 不建议把核心保险库保存成 PostgreSQL 数据目录。

桌面客户端的：

```text
cache
index
UI settings
```

可以使用：

```text
SQLite
```

但：

**SQLite 不应该成为 LVCF 唯一数据标准。**

保险库本身保持：

```text
标准化 Container
+
Manifest
+
Encrypted Objects
```

这样更容易长期兼容。

------

# 55. 搜索索引

保险库解锁以后：

```text
Encrypted Data
       ↓
Memory
       ↓
Search Index
```

搜索索引最好：

```text
只存在内存
```

或者：

```text
加密缓存
```

应用退出：

```text
destroy
```

不能在：

```text
AppData
```

留下账号名称和密码等明文搜索索引。

------

# 56. 缓存策略

以下内容禁止落盘为明文：

```text
Password
Recovery Code
Private Key
Seed Phrase
Secure Note
Attachment
Clipboard History
Search Index
```

------

# 57. 剪贴板保护

复制密码：

```text
Copy
```

例如：

```text
30 seconds
```

后自动清理剪贴板。

时间可配置。

必须避免把：

```text
历史密码
```

长期写入应用日志。

------

# 58. 日志

应用日志严禁包含：

```text
Master Password
VMK
KEK
Private Key
Password
2FA Secret
Recovery Code
Seed Phrase
Secure Note
Attachment Content
```

日志中只记录：

```text
VaultId truncated
Error Code
Operation Type
Timestamp
```

------

# 59. Crash Dump

崩溃报告必须考虑：

```text
内存中可能存在解密数据
```

生产版应严格控制：

```text
Core Dump
Crash Dump
Telemetry
```

避免上传敏感内存。

------

# 60. 内存安全

Rust 加密核心处理敏感信息时尽可能使用：

```text
Zeroize
```

例如：

```rust
use zeroize::Zeroize;
```

Master Password、VMK、KEK 使用完成：

```text
zeroize
```

------

# 61. Rust 加密核心

建议：

```text
legacylock-core
```

完全使用 Rust。

负责：

```text
Crypto
LVCF
Key Management
Signature
Media Verification
Vault Transactions
Recovery Protocol
Integrity Verification
Migration
```

前端不得直接实现密码算法。

------

# 62. 桌面技术栈

建议：

```text
Electron
+
React
+
TypeScript
```

UI。

核心安全功能：

```text
Rust
```

通过：

```text
N-API
FFI
Native Module
Local IPC
```

桥接。

如果后续希望减小体积，可以评估：

```text
Tauri
```

但不建议为了技术潮流频繁更换客户端框架。

------

# 63. 技术分层

```text
┌─────────────────────────────┐
│ React / TypeScript UI       │
├─────────────────────────────┤
│ Desktop Application Layer   │
├─────────────────────────────┤
│ Rust Bridge                 │
├─────────────────────────────┤
│ LegacyLock Core             │
│                             │
│ Crypto                      │
│ Vault                       │
│ Key Management              │
│ Recovery                    │
│ Media                       │
│ Migration                   │
├─────────────────────────────┤
│ Operating System            │
└─────────────────────────────┘
```

------

# 64. Rust Workspace

建议项目：

```text
legacylock/
│
├── apps/
│   ├── desktop/
│   └── recovery-reader/
│
├── crates/
│   ├── legacylock-core/
│   ├── legacylock-crypto/
│   ├── legacylock-format/
│   ├── legacylock-media/
│   ├── legacylock-recovery/
│   ├── legacylock-migration/
│   └── legacylock-audit/
│
├── server/
│
├── specs/
│   └── lvcf/
│
├── docs/
│
└── tests/
```

------

# 65. legacylock-crypto

只负责：

```text
Random
KDF
AEAD
HKDF
Signature
Key Wrapping
Secure Memory
```

禁止：

```text
UI
网络
文件选择
业务规则
```

------

# 66. legacylock-format

负责：

```text
LVCF Reader
LVCF Writer
Version Detection
Manifest Parsing
Compatibility
Migration
```

------

# 67. legacylock-media

负责：

```text
Removable Media Detection
Mount Monitoring
Media ID
Filesystem Capability
Safe Eject
Health Check
Read/Write
```

------

# 68. legacylock-recovery

负责：

```text
Owner + Heir Pairing
Recovery Verification
Recovery Key Reconstruction
Read Only Capability
Inheritance State
```

------

# 69. legacylock-migration

负责：

```text
Format Migration
Cipher Suite Migration
KDF Upgrade
Key Slot Upgrade
Media Migration
```

------

# 70. 前端页面

第一版建议：

```text
Welcome
Create Vault
Unlock Owner Vault
Dashboard
Vault Items
Item Editor
Attachments
Inheritance
Heir Media
Backup
Vault Health
Security
Migration
Settings
Recovery Mode
Export
Audit
```

------

# 71. 创建保险库流程

```text
Create Vault
     ↓
Master Password
     ↓
Generate Vault ID
     ↓
Generate VMK
     ↓
Generate Owner Signing Key
     ↓
Create Owner Key Slot
     ↓
Initialize LVCF
     ↓
Verify
     ↓
Create Backup Recommendation
```

------

# 72. 创建 Heir Media

流程：

```text
Owner Mode
      ↓
Inheritance
      ↓
Add Heir
      ↓
Insert Removable Media
      ↓
Initialize Heir Media
      ↓
Generate Heir Key Material
      ↓
Create Recovery Slot
      ↓
Owner Signature
      ↓
Verify
      ↓
Safe Eject
```

------

# 73. 配对验证

必须验证：

```text
Owner Vault ID
=
Heir Vault ID
```

并验证：

```text
Recovery Generation
Heir ID
Owner Signature
Key Slot Signature
```

------

# 74. Heir Media 内容

推荐：

```text
LEGACYLOCK-HEIR/
│
├── heir.header
├── recovery.ks
├── owner-public-info
├── instructions/
│   ├── README.zh-CN.txt
│   └── README.en.txt
└── recovery-reader/
```

Heir Media 不保存完整保险库。

它主要保存：

```text
Recovery Key Material
```

------

# 75. Owner Media 内容

```text
LEGACYLOCK/
│
├── legacylock.header
├── vault/
├── keyslots/
├── signatures/
├── audit/
└── recovery/
```

主要数字资产仍然位于 Owner Media。

因此继承时：

```text
Owner Media
+
Heir Media
```

缺一不可。

------

# 76. 为什么不把资产复制到 Heir Media

如果副介质也保存完整可解密资产：

继承人长期持有：

```text
完整密文
```

会增加攻击面。

LegacyLock 核心模型保持：

```text
Owner Media = Vault
Heir Media = Recovery Capability
```

比较清晰。

------

# 77. Owner Media 丢失

这是必须考虑的灾难场景。

如果只有：

```text
Owner Media
+
Heir Media
```

Owner Media 完全损坏：

资产仍然可能永远丢失。

所以生产设计应要求至少：

```text
Primary Owner Media
+
Backup Owner Media
+
Heir Media
```

建议安装向导明显警告：

```text
只有一个 Owner Media 不属于完整备份方案。
```

------

# 78. Backup Verification

备份完成必须：

```text
Read Back
Hash Verify
Manifest Verify
Key Slot Verify
```

而不是：

```text
copy completed
```

就认为成功。

------

# 79. 3-2-1 建议

对于特别重要的数据，可以建议：

```text
3 copies
2 media
1 geographically separate
```

例如：

```text
Owner SSD
Owner Backup USB
Encrypted Offsite Backup
```

第三份仍然必须加密。

------

# 80. 云备份

未来可以增加：

```text
Encrypted Cloud Backup
```

服务器只保存：

```text
Ciphertext
```

不能保存：

```text
VMK
Master Password
Decrypted Key Slot
```

云备份不是 MVP 必需功能。

------

# 81. 审计日志

Owner 可以查看：

```text
Vault Created
Item Added
Item Modified
Item Deleted
Heir Created
Heir Revoked
Media Migrated
Cipher Migrated
Backup Created
Health Check
```

审计日志本身：

```text
encrypted
+
signed
```

------

# 82. 隐私设计

服务器尽量不知道用户保存了什么。

服务端不应该获得：

```text
用户密码
保险库内容
附件内容
Master Password
VMK
Recovery Secret
```

------

# 83. 服务器数据库

服务端可以使用：

```text
PostgreSQL
```

保存：

```text
Account
Device
Vault Registration
Recovery Policy
Notification Status
Revocation Metadata
Subscription
Audit Metadata
```

不保存保险库明文。

------

# 84. 服务端 API 示例

```text
POST /api/v1/account/register

POST /api/v1/vault/register

GET  /api/v1/vault/{id}/status

POST /api/v1/heir/register

POST /api/v1/heir/revoke

POST /api/v1/checkin

POST /api/v1/recovery/start

POST /api/v1/recovery/cancel

GET  /api/v1/recovery/status
```

------

# 85. API 版本

API 从第一天开始：

```text
/api/v1/
```

禁止无版本 API：

```text
/api/recovery
```

方便长期维护。

------

# 86. 文件格式版本与软件版本必须分离

例如：

```text
LegacyLock App 7.5
```

仍然可能读取：

```text
LVCF 1.0
```

不能：

```text
App Version = File Version
```

二者必须完全解耦。

------

# 87. minimum_reader_version

Header：

```json
{
  "format_version": "2.1",
  "minimum_reader_version": "2.0"
}
```

客户端发现无法安全读取：

```text
不要尝试猜测解析。
```

应该提示：

```text
此保险库需要更新版本的 LegacyLock Reader。
```

------

# 88. Unknown Fields

未来版本增加字段时：

旧 Reader：

```text
Unknown Optional Field
```

可以忽略。

但：

```text
Unknown Critical Field
```

必须拒绝打开。

可以借鉴：

```text
critical flag
```

设计。

------

# 89. 数据 Schema

建议：

```text
CBOR
```

或其它明确、稳定、跨语言的序列化格式。

外部 Header 可以使用简单 JSON。

内部加密 Manifest 推荐：

```text
CBOR
```

避免长期依赖 JavaScript 对 JSON 的特殊行为。

------

# 90. 时间格式

所有内部时间：

```text
UTC
```

外部显示：

```text
Local Time
```

存储：

```text
Unix Timestamp
```

或：

```text
RFC3339 UTC
```

格式必须规范化。

------

# 91. ID

不要使用：

```text
数组下标
文件名
标题
```

作为唯一 ID。

统一使用：

```text
UUID
```

或足够长随机标识。

------

# 92. 附件

附件不能直接：

```text
attachment/photo.jpg
```

明文存储。

应该：

```text
objects/<object-id>
```

所有内容加密。

文件名本身：

```text
photo.jpg
```

也应该在加密 Manifest 中。

------

# 93. 大文件

大型附件使用：

```text
chunk encryption
```

例如：

```text
64 MiB
```

分块。

每个 Chunk：

```text
独立 nonce
独立 authentication tag
```

避免加载数 GB 文件到内存。

------

# 94. 文件大小限制

MVP 可以定义：

```text
单附件默认 2GB
```

后续根据文件格式和压力测试调整。

架构不得写死：

```text
2GB
```

限制。

------

# 95. 恢复导出

Heir 模式允许导出：

```text
JSON
CSV
PDF
Encrypted Archive
```

但：

密码、私钥等敏感数据导出必须明确提醒。

推荐优先：

```text
Encrypted LegacyLock Export
```

其次才：

```text
Plaintext Export
```

------

# 96. 打印模式

数字遗产场景可能需要：

```text
Print Recovery Report
```

但必须默认隐藏：

```text
Password
Private Key
Seed Phrase
```

只有用户明确选择才打印。

------

# 97. 截屏保护

支持的平台可以提供：

```text
Screen Capture Protection
```

但不能将其宣传为绝对安全。

------

# 98. 自动锁定

Owner Mode：

```text
Idle Timeout
```

例如：

```text
5 / 10 / 30 minutes
```

自动锁定。

介质被拔出：

```text
立即锁定
```

------

# 99. Heir Mode 拔盘

任何一个介质：

```text
Owner Media
Heir Media
```

被拔出：

```text
立即锁定
```

并从内存清理解密密钥。

------

# 100. 介质热插拔

LegacyLock 需要监听：

```text
USB Added
USB Removed
Volume Mounted
Volume Unmounted
```

但不要自动打开任意文件。

避免：

```text
AutoRun 风险
```

------

# 101. 不执行介质中的程序

主程序禁止自动执行：

```text
.exe
.sh
.bat
.ps1
.command
```

Owner/Heir Media 中任何文件。

Recovery Reader 需要用户主动运行。

------

# 102. 防路径穿越

处理 LVCF 内部文件必须防止：

```text
../
..\ 
absolute path
symlink
junction
```

造成：

```text
Path Traversal
```

尤其 Import / Restore 功能。

------

# 103. 安全导入

任何导入数据：

```text
Validate
Parse
Limit
Decrypt
Verify
```

禁止直接信任。

包括：

```text
LVCF
JSON
CSV
ZIP
Attachments
```

------

# 104. 主密码恢复

必须明确一个原则：

如果用户忘记 Master Password：

不能设计：

```text
LegacyLock 客服帮你找回密码
```

否则服务器事实上掌握解密能力。

可以设计：

```text
Recovery Kit
```

------

# 105. Recovery Kit

Owner 可以主动生成：

```text
LegacyLock Emergency Recovery Kit
```

包含：

```text
Vault ID
Recovery Version
Emergency Instructions
Recovery Secret Material
```

必须：

```text
用户主动生成
+
强提示妥善保存
```

可以：

```text
打印
离线保存
```

------

# 106. Recovery Kit 与 Heir Media 区分

Heir Media：

```text
数字遗产继承
```

Recovery Kit：

```text
Owner 自救
```

二者不是同一个机制。

------

# 107. MFA

应用账号的 MFA 与保险库解密必须区分。

例如：

```text
LegacyLock Cloud Login MFA
```

不能成为：

```text
Offline Vault Decryption
```

的永久依赖。

------

# 108. Passkey

云账户可以支持：

```text
Passkey
WebAuthn
```

用于：

```text
服务器账户登录
继承计划管理
```

但 Offline Recovery 不依赖 Passkey 服务端。

------

# 109. Threat Model

正式发布前必须建立 Threat Model。

至少考虑：

```text
U盘被盗
Owner Media 被复制
Heir Media 被复制
Owner PC 中毒
恶意软件读取内存
Ransomware
服务器入侵
数据库泄漏
云存储泄漏
供应链攻击
恶意继承人
错误继承
旧版本回滚
介质损坏
恶意文件导入
应用更新被劫持
LegacyLock 公司消失
密码算法淘汰
```

------

# 110. 不解决的问题

LegacyLock 不能保证抵御：

```text
Owner 电脑已经完全被 Rootkit 控制
```

时的所有攻击。

也不能保证：

```text
用户主动把 Master Password 告诉攻击者
```

以后仍保持安全。

开发文档应该明确：

```text
Threat Model Boundary
```

避免“绝对安全”宣传。

------

# 111. 更新安全

客户端更新必须：

```text
Code Signing
```

更新包：

```text
Signature Verification
```

禁止单纯根据：

```text
HTTPS
```

认为更新安全。

------

# 112. 自动升级不能升级保险库格式

软件版本升级：

```text
App 2 → App 3
```

不能自动：

```text
LVCF 1 → LVCF 2
```

保险库格式升级必须：

```text
Backup
Verify
User Approval
Migrate
Verify
Commit
```

------

# 113. Vault Migration Wizard

提供：

```text
升级保险库
```

例如：

```text
LVCF 1.0
→
LVCF 2.0
```

流程：

```text
Verify Old Vault
        ↓
Backup
        ↓
Create Migration Snapshot
        ↓
Migrate
        ↓
Verify
        ↓
Commit
```

失败：

```text
Rollback
```

------

# 114. Legacy Reader

新版本软件至少保留：

```text
旧格式 Reader
```

例如：

```text
LVCF 1 Reader
LVCF 2 Reader
LVCF 3 Reader
```

Writer 可以只支持：

```text
Current Format
```

Reader 则尽可能长期支持旧格式。

------

# 115. 格式弃用原则

如果必须停止支持某格式：

至少提前：

```text
多个主要版本
```

提醒。

例如：

```text
LVCF 1 Reader 将在未来停止支持。

请执行 Vault Migration。
```

数字遗产产品不应轻易弃用旧格式。

------

# 116. 长期兼容测试

测试库保留：

```text
LVCF 1.0 Golden Vault
LVCF 1.1 Golden Vault
LVCF 2.0 Golden Vault
```

每次发布运行：

```text
Compatibility Test
```

保证新版本仍然读取十年前生成的样本。

------

# 117. Golden Test Vectors

公开：

```text
LVCF Test Vectors
```

例如：

```text
正常文件
损坏 Header
错误 Signature
错误 Password
损坏 Object
旧格式
未知 Optional Field
未知 Critical Field
```

方便第三方实现 Reader。

------

# 118. 测试要求

测试分为：

```text
Unit Test
Integration Test
Compatibility Test
Security Test
Fuzz Test
Fault Injection
Media Test
Recovery Test
Migration Test
```

------

# 119. Fuzz Testing

重点：

```text
LVCF Parser
CBOR Parser
Manifest
Key Slot
Import
Recovery Metadata
```

使用：

```text
cargo-fuzz
libFuzzer
```

测试恶意输入。

------

# 120. Fault Injection

模拟：

```text
写到 1% 拔盘
写到 50% 拔盘
Commit 前断电
Commit 后断电
磁盘空间不足
文件系统只读
坏文件
权限错误
```

保险库必须保持：

```text
Old Valid
```

或：

```text
New Valid
```

不能两边都损坏。

------

# 121. 支持文件系统

第一版建议优先测试：

```text
exFAT
NTFS
APFS
ext4
```

但跨平台介质建议优先：

```text
exFAT
```

具体推荐需根据：

```text
原子重命名
fsync 行为
文件大小
平台兼容
```

实测后确定。

不能单纯因为：

```text
Windows + macOS 都能读取
```

就选择某文件系统。

------

# 122. 文件系统不是安全边界

即使：

```text
NTFS
```

支持 ACL：

LegacyLock 也不能依赖 ACL 实现：

```text
Heir Read Only
```

安全边界仍然是：

```text
Cryptographic Capability
```

------

# 123. 安全等级宣传

不建议使用：

```text
绝对安全
军规级
无法破解
量子安全
永远不会丢失
```

这类无法严格证明的宣传。

更准确：

> 使用现代密码学、离线恢复和双介质权限隔离设计。

------

# 124. MVP 功能范围

LegacyLock 1.0 必须完成：

```text
Owner Vault
Master Password
Owner Media
Heir Media
Owner Mode
Heir Read Only Mode
LVCF 1.0
Login Item
Secure Note
Software License
Attachment
Owner Signature
Manifest Verification
Backup Owner Media
Heir Reissue
Heir Revoke
Media Migration
Vault Health
Recovery Reader
Offline Recovery
Vault Export
```

------

# 125. 1.0 不建议加入

第一版暂缓：

```text
Cloud Sync
Mobile App
Browser Extension
AI
Automatic Account Transfer
Complex Threshold Recovery
Blockchain
Crypto Wallet Transaction
Automatic Legal Verification
Full Dead Man Switch
```

先把：

```text
加密
文件格式
恢复
权限
长期兼容
```

做好。

------

# 126. Phase 0 —— Specification

时间不限死。

目标：

```text
Threat Model
LVCF 1.0 Specification
Crypto Design
Recovery Protocol
Permission Model
```

此阶段没有完成：

不要正式开发大规模 UI。

------

# 127. Phase 1 —— Crypto Core

开发：

```text
legacylock-crypto
legacylock-format
```

完成：

```text
VMK
KDF
Key Slot
AEAD
Signature
Manifest
Object Encryption
```

------

# 128. Phase 2 —— Owner Vault

完成：

```text
Create Vault
Unlock
CRUD
Attachments
Atomic Transaction
Backup
Health Check
```

------

# 129. Phase 3 —— Heir Recovery

完成：

```text
Create Heir
Pair Media
Recovery Protocol
Read Only Mode
Export
Revoke
Reissue
```

------

# 130. Phase 4 —— Recovery Reader

开发独立：

```text
legacylock-recovery-reader
```

只提供：

```text
Offline
Read
Verify
Recover
Export
```

------

# 131. Phase 5 —— Server

最后再增加：

```text
Account
Notification
Check-in
Recovery Coordination
Subscription
```

核心保险库不因服务器尚未完成而无法工作。

------

# 132. Phase 6 —— Security Audit

正式发布前：

```text
Independent Code Review
Cryptographic Review
Threat Model Review
Penetration Test
Fuzz Test
Recovery Drill
```

涉及长期数字遗产，不建议仅靠内部测试直接正式发布。

------

# 133. 发布前必须完成的恢复演习

创建一套保险库。

然后模拟：

```text
原开发电脑不存在
服务器关闭
账户不存在
互联网断开
```

只提供：

```text
Owner Media
Heir Media
Recovery Reader
LVCF Documentation
```

由另一台干净电脑恢复。

如果不能恢复：

产品不得称为：

```text
Offline Recoverable
```

------

# 134. 关键安全不变量

以下规则应该写进项目 README：

## Rule 1

服务器永远不能掌握恢复保险库所需的全部秘密。

## Rule 2

Heir Media 永远不能获得 Owner 写权限。

## Rule 3

Owner Private Signing Key 永远不得写入 Heir Media。

## Rule 4

任何保险库修改都必须签名。

## Rule 5

核心恢复不得永久依赖 LegacyLock Server。

## Rule 6

新版本必须能够识别保险库格式版本。

## Rule 7

旧保险库不得未经用户确认自动迁移。

## Rule 8

保险库更新必须使用事务。

## Rule 9

备份完成必须重新读取验证。

## Rule 10

任何密码学算法都必须可版本化。

------

# 135. 产品最终结构

最终架构：

```text
                       ┌─────────────────────┐
                       │ LegacyLock Server   │
                       │                     │
                       │ Coordination Only   │
                       └──────────┬──────────┘
                                  │
                           Optional Online
                                  │
                                  ▼
┌──────────────────────────────────────────────────────┐
│                   LegacyLock App                     │
│                                                      │
│        UI / Vault / Recovery / Migration             │
└───────────────────┬─────────────────┬────────────────┘
                    │                 │
                    │                 │
              Owner Mode        Recovery Mode
                    │                 │
                    ▼                 ▼
             Owner Media       Owner Media
                    │                 +
          Master Password        Heir Media
                    │                 │
                    ▼                 ▼
              READ / WRITE         READ ONLY
              ADMIN               EXPORT
              REKEY               RECOVER
              MIGRATE
```

------

# 136. 推荐完整物理配置

普通用户：

```text
Owner Media A
+
Owner Backup Media B
+
Heir Media
```

例如：

```text
Samsung / SanDisk 移动 SSD
+
备用 USB U盘
+
继承人 USB U盘
```

LegacyLock 不应绑定品牌。

------

# 137. 非常重要的产品原则

LegacyLock 的设计重点不能只是：

> 如何让今天的数据无法被别人看到。

更重要的是：

> 如何保证二十年以后，合法继承人仍然能够安全地看到这些数据。

因此产品设计必须同时满足：

```text
Security
+
Recoverability
+
Durability
+
Compatibility
+
Migration
```

任何只提高“今天安全性”，但大幅降低“未来恢复能力”的设计，都必须慎重采用。

------

# 138. LegacyLock 的长期定位

LegacyLock 最终不应该只是：

```text
双U盘密码管理器
```

而应该逐步发展为：

```text
LegacyLock Application
+
LVCF Long-Term Vault Format
+
Recovery Protocol
+
Recovery Reader
+
Optional Coordination Service
```

即：

**数字遗产保险库应用 + 长期数字遗产保存协议。**

------

# 139. 开发优先级

最高优先级：

```text
P0

LVCF
VMK
Key Slot
Owner / Heir Capability
Owner Signature
Atomic Transaction
Offline Recovery
Backup Verification
Recovery Reader
```

第二优先级：

```text
P1

Vault UI
Attachments
Software License
Digital Asset
Health Check
Media Migration
Heir Reissue
Heir Revocation
Audit
```

第三优先级：

```text
P2

Server
Notification
Dead Man Switch
Cloud Backup
Passkey
Multiple Heirs
```

长期：

```text
P3

Threshold Recovery
Post-Quantum Migration
Mobile Companion
Browser Extension
Enterprise Trustee
```

------

# 140. 最终开发原则总结

LegacyLock 应遵循下面十六条原则：

1. **主介质拥有管理权限。**
2. **继承介质只有恢复权限。**
3. **继承模式永远只读。**
4. **U盘只是介质之一。**
5. **支持移动硬盘、SSD 和其它移动存储。**
6. **所有修改必须由 Owner 密钥签名。**
7. **文件只读属性不是安全措施。**
8. **文件格式必须版本化。**
9. **密码算法必须可迁移。**
10. **服务器不得成为唯一解密条件。**
11. **必须支持完全离线继承。**
12. **必须提供独立 Recovery Reader。**
13. **LVCF 应长期公开和维护。**
14. **新版本长期兼容旧保险库。**
15. **至少存在一个经过验证的 Owner Backup。**
16. **LegacyLock 公司消失后，数字遗产仍然能够恢复。**

------

# 141. 第一阶段开发目标

真正开始编码时，不建议先开发漂亮 UI。

第一阶段建议只开发一个 CLI：

```text
legacylock-cli
```

至少实现：

```text
legacylock init

legacylock add

legacylock list

legacylock verify

legacylock backup

legacylock heir-create

legacylock heir-revoke

legacylock recovery

legacylock migrate-media
```

首先证明：

```text
Owner Media
+
Master Password
```

能够修改数据。

然后证明：

```text
Owner Media
+
Heir Media
```

能够：

```text
解密
查看
导出
```

但：

```text
无法生成合法修改
```

最后证明：

```text
服务器完全关闭
```

仍可以完成继承恢复。

只有这三条全部成立以后，再开始正式开发 Electron UI。

------

# 142. 第一阶段验收标准

## Test A — Owner

```text
Owner Media
+
Master Password
```

结果：

```text
CREATE = PASS
READ   = PASS
UPDATE = PASS
DELETE = PASS
```

------

## Test B — Heir

```text
Owner Media
+
Heir Media
```

结果：

```text
READ   = PASS
EXPORT = PASS

CREATE = DENIED
UPDATE = DENIED
DELETE = DENIED
REKEY  = DENIED
```

------

## Test C — Tamper

直接用 Hex Editor 修改：

```text
manifest
```

结果：

```text
SIGNATURE INVALID
```

程序拒绝加载。

------

## Test D — Offline

断开互联网。

关闭测试服务器。

结果：

```text
RECOVERY = PASS
```

------

## Test E — Media Migration

```text
USB Flash
    ↓
Mobile SSD
```

结果：

```text
Vault ID preserved
Data preserved
Signature valid
Recovery preserved
```

------

## Test F — Old Format

使用新版本 LegacyLock 打开：

```text
LVCF 1.0 Golden Vault
```

结果：

```text
READ = PASS
```

------

# 143. 结论

LegacyLock 的核心价值不应定义为：

> 两个 U盘才能打开密码库。

更准确的产品定义应该是：

> LegacyLock 是一个采用主介质与继承介质权限隔离设计的长期数字遗产保险库。所有者拥有完整管理权限；继承人必须持有合法继承介质并配合所有者介质才能进行只读接管。保险库采用开放、版本化且可迁移的长期存储格式，即使未来应用升级、存储介质更换、服务器停止运行或 LegacyLock 项目停止维护，合法持有人仍应能够恢复数字遗产。

这应该成为 LegacyLock 后续所有开发决策的最高设计原则。