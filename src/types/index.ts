/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 核心数据模型与类型系统 (Type Definitions)
 * ============================================================================
 * 
 * 包含：
 * 1. 数字资产分类 (VaultCategory) 与结构化字段凭据 (VaultItem)
 * 2. 军规容器标准头 (LvcfHeader - LVCF 2.0 规范)
 * 3. 硬件安全介质抽象层 (SecureMedia & UsbDrive)
 * 4. 密码学加密密包容器 (EncryptedContainer) 与双钥匙协商状态 (DualUnlockState)
 * 5. 双钥匙 PIN 密码管理与防暴力哈希配置 (UsbPasswordConfig)
 * 6. 遗产传承计划配置 (HeritagePlanConfig) 与健康自检报告 (VaultHealthReport)
 */

/**
 * 核心资产分类标识
 * 支持军规级标准的 12+ 大维度资产结构化收录
 */
export type VaultCategory =
  | 'login'            // 登录信息：账号、密码、2FA 动态验证码
  | 'note'             // 安全便签：遗嘱补充、私密留言、保险箱实体密码
  | 'card'             // 银行卡/信用卡：卡号、CVV、有效期、开户网点
  | 'identity'         // 身份标识：身份证、护照、社保号、户籍信息
  | 'password'         // 独立密码：锁屏 PIN、BIOS 口令、WiFi 密码
  | 'document'         // 加密文档：房产证明、信托合约、重要授权书
  | 'sshKey'           // SSH 密钥：服务器根私钥、Git 凭据
  | 'apiCredential'    // API 凭据：云服务 Token、OpenAI/AI 访问密钥
  | 'membership'       // 会员权益：积分会员、俱乐部凭证
  | 'cryptoWallet'     // 加密货币钱包：BIP39 助记词、冷钱包私钥
  | 'medical'          // 医疗健康档案：病历、紧急医疗卡
  | 'reward'           // 奖励积点：航司里程、酒店尊享积分
  | 'outdoorLicense'   // 特种执照：执业资格证、持枪许可等
  | 'passport'         // 护照专属卡
  | 'database'         // 数据库凭据：MySQL、PostgreSQL、Redis 连接串
  | 'router'           // 路由器网关：管理账号、无线通信口令
  | 'server'           // 服务器/云主机：Linux VPS 根凭据、RDP 连接口令
  | 'email'            // 核心主邮箱凭据
  | 'ssn'              // 社会安全号专属卡
  | 'softwareLicense'  // 商业软件买断授权序列号
  | 'bankAccount'      // 银行储蓄与对公结算账户
  | 'driverLicense'    // 驾驶证凭据
  | 'game'             // 游戏平台资产：Steam、PlayStation、战网
  | 'license';         // 通用商业授权许可

/**
 * 自定义字段类型支持 (军规级规格标准)
 */
export type VaultFieldType =
  | 'text'        // 文本
  | 'url'         // 网站 URL
  | 'email'       // 电子邮件
  | 'address'     // 地址
  | 'date'        // 日期
  | 'totp'        // 一次性密码
  | 'password'    // 密码 / 敏感保密口令
  | 'phone'       // 电话
  | 'note';       // 备注

/**
 * 自定义键值对字段结构
 * 允许用户在标准字段外扩展专属属性（如“备用助记词”、“安全问题回答”、“服务器端口”）
 */
export interface VaultField {
  /** 字段唯一识别符 (UUID) */
  id: string;
  /** 字段展示名称 / 自定义标题 (如 "备用邮箱", "二阶段验证码") */
  name: string;
  /** 字段真实取值 / 自定义内容 */
  value: string;
  /** 是否属于敏感保密字段 (为 true 时默认掩码隐藏，防物理窥视) */
  isSecret: boolean;
  /** 字段语义类型 */
  type?: VaultFieldType;
}

/**
 * 单个附件最大允许大小：2MB (严格按用户要求限制，支持各类文件)
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2MB (2,097,152 字节)

/**
 * 资产项目加密附件实体 (VaultAttachment)
 * 支持各类型文件 (PDF、文档、图片、密钥文件、配置、压缩包等)
 * Base64 编码随资产项目一同经 AES-256-GCM 认证加密存储
 */
export interface VaultAttachment {
  /** 附件唯一识别符 (UUID) */
  id: string;
  /** 原始文件名 (如 "房产证明.pdf", "privkey.pem", "id_photo.jpg") */
  name: string;
  /** 文件原始大小 (字节)，必须 <= 2MB */
  size: number;
  /** 文件 MIME 类型 (如 "application/pdf", "image/png") */
  type: string;
  /** 文件 Base64 Data URL (data:...;base64,...) */
  data: string;
  /** 上传时间戳 (毫秒) */
  uploadedAt: number;
}

/**
 * 资产项目核心数据结构 (VaultItem)
 * 系统中存储的每一条数字遗产凭据的实体对象
 */
export interface VaultItem {
  /** 资产全局唯一 ID (UUIDv4) */
  id: string;
  /** 资产标题/名称 (如 "个人中心主银行卡") */
  title: string;
  /** 归属资产分类 */
  category: VaultCategory;
  /** 登录账号 / 用户名 / 公钥 */
  username?: string;
  /** 登录密码 / 核心私钥 / PIN 码 */
  password?: string;
  /** 关联网址 / 服务端接入点 URL */
  url?: string;
  /** 私密备注 / 说明文字 / 纸质线索指引 */
  notes?: string;
  /** 自定义扩展键值对列表 */
  customFields?: VaultField[];
  /** 加密附件列表 (单个文件 <= 2MB) */
  attachments?: VaultAttachment[];
  /** 继承人专属接管指引与留言 (仅继承人激活后可见) */
  inheritanceInstructions?: string;
  /** 修订版本流水号 (单调递增，用于防重放与防回滚) */
  revision?: number;
  /** 创建时间戳 (毫秒) */
  createdAt: number;
  /** 最后修改时间戳 (毫秒) */
  updatedAt: number;
}

/**
 * 应用运行模式
 * - OWNER: 所有者模式 (具备完全读写权限、增删改查、密钥派生)
 * - HEIR_RECOVERY: 继承人只读接管模式 (双盘解锁激活后进入，严禁修改/删除，确保法律真实性)
 */
export type OperatingMode = 'OWNER' | 'HEIR_RECOVERY';

/**
 * LVCF 2.0 军规级容器标准头 (LegacyLock Vault Container Format)
 * 遵循零知识证明与防伪签章体系
 */
export interface LvcfHeader {
  /** 容器魔数：固定为 "LEGACYLOCK" */
  magic: 'LEGACYLOCK';
  /** 容器类型：固定为 "LVCF" */
  container: 'LVCF';
  /** 容器规范版本号 (当前为 "2.0") */
  format_version: '2.0';
  /** 最低兼容解密客户端版本 */
  minimum_reader_version: '1.0';
  /** 密库唯一 GUID 识别符 */
  vault_id: string;
  /** 签发角色身份 */
  role: 'OWNER' | 'HEIR';
  /** 递增时序序列号 (Sequence Monotonicity，杜绝旧密库覆盖攻击) */
  sequence: number;
  /** 世代计数器 (Generation Counter) */
  generation: number;
  /** 密库创建时间 (ISO-8601 UTC) */
  created_at: string;
  /** 密库最后更新时间 (ISO-8601 UTC) */
  updated_at: string;
  /** 军规密码套件标识 (LLCS-1: AES-256-GCM + PBKDF2-100k + X25519) */
  cipher_suite: 'LLCS-1';
  /** 密文清单摘要 (SHA-256 完整性哈希) */
  manifest_hash_hex: string;
  /** 所有者 Ed25519 数字签名 (防伪造与篡改) */
  owner_signature_hex: string;
}

/**
 * 物理存储介质类型定义
 */
export type MediaType =
  | 'UsbFlash'        // 普通 USB 闪存盘
  | 'UsbSSD'          // 外接移动固态硬盘 (USB SSD)
  | 'UsbHDD'          // 外接移动机械硬盘 (USB HDD，推荐用于 20 年+ 长期防电荷衰减冷存)
  | 'NvmeEnclosure'   // 高速 NVMe 移动硬盘盒
  | 'SDCard'          // SD 卡
  | 'MicroSD'         // TF / MicroSD 存储卡
  | 'OtherRemovable'; // 其他可移动安全物理介质

/**
 * 硬件安全介质描述模型
 */
export interface SecureMedia {
  mediaId: string;
  mediaType: MediaType;
  mountPath: string;
  name: string;
  capacity?: string;
  filesystem: string;
  isRemovable: boolean;
  isWritable: boolean;
  healthStatus: 'Healthy' | 'Warning' | 'Damaged' | 'RecoveryRequired';
  hasOwnerSlot: boolean;
  hasHeirSlot: boolean;
  hasManifest: boolean;
}

/**
 * 密库 6 项健康与密码学自检报告模型
 */
export interface VaultHealthReport {
  /** 综合健康状态等级 */
  status: 'Healthy' | 'Warning' | 'Damaged' | 'RecoveryRequired';
  /** 综合自检健康得分 (0 ~ 100) */
  score: number;
  /** 综合安全评级得分 */
  overallScore?: number;
  /** 密库 ID */
  vaultId?: string;
  /** 检查项 1：LVCF 2.0 容器魔数与格式完整性校验 */
  headerVerified: boolean;
  /** 检查项 2：所有者非对称数字签名有效性验签 */
  signatureVerified: boolean;
  /** 检查项 3：对象数据哈希与 AEAD 完整性校验 */
  objectHashVerified: boolean;
  /** 检查项 4：防回滚单调计数器时序检查 */
  antiRollbackVerified: boolean;
  /** 检查项 5：双钥匙公私钥槽位映射校验 */
  keySlotVerified: boolean;
  /** 检查项 6：30 年离线救援自救单页存续性检查 */
  offlineRescuePresent: boolean;
  /** 发现的异常问题描述列表 */
  issues: string[];
  /** 自检时间戳 (毫秒) */
  lastCheckedAt: number;
}

/**
 * 法定继承人档案记录
 */
export interface HeirRecord {
  id: string;
  name: string;
  contact: string;
  notes: string;
  generation: number;
  createdAt: number;
  expiryTimestamp: number;
  isRevoked: boolean;
  publicHex: string;
  instructions?: string;
}

/**
 * 双钥匙 PIN 码与硬件防护参数模型
 */
export interface UsbPasswordConfig {
  /** 是否配置了所有者主密码 (Master PIN) */
  hasMasterPassword: boolean;
  /** 所有者主密码加盐哈希值 (PBKDF2-SHA256 100,000 轮) */
  masterPasswordHash?: string;
  /** 16 字节真随机盐值 (Hex 编码) */
  masterPasswordSalt?: string;
  /** 所有者密码提示词 (不存明文密码) */
  masterPasswordHint?: string;

  /** 是否配置了法定继承人接管口令 (Heir PIN) */
  hasHeirPassword: boolean;
  /** 继承人口令加盐哈希值 */
  heirPasswordHash?: string;
  /** 继承人口令独立随机盐值 */
  heirPasswordSalt?: string;
  /** 继承人口令提示词 */
  heirPasswordHint?: string;

  /** 是否配置了军规级紧急安全密钥 (Secret Key) */
  hasSecretKey?: boolean;
  /** 128位紧急安全密钥明文 (LL-XXXX-XXXX-XXXX-XXXX-XXXX，仅本地受保护留存，重装需重新输入) */
  secretKey?: string;
  /** 安全密钥的 SHA-256 哈希值 (用于快速验签输入有效性) */
  secretKeyHash?: string;
  /** 安全密钥生成时间戳 */
  secretKeyCreatedAt?: number;

  /** 无操作空闲自动锁屏分钟数 (5, 15, 30, 60, 0=从不) */
  autoLockMinutes: number;
  /** 最后修改时间 */
  lastChangedAt?: number;
  /** 硬件级加密防护状态 */
  isHardwareEncrypted: boolean;
}

/**
 * 左侧导航分类枚举集合 (包含业务分类与系统虚拟入口)
 */
export type NavCategoryType =
  | 'all'             // 全部资产
  | 'registry'        // 系统注册项/主目录
  | 'browser'         // 浏览器存储密码
  | 'network'         // 网络资产
  | 'mail'            // 电子邮箱
  | 'wifi'            // WiFi 连接
  | 'bitlocker'       // 磁盘 BitLocker 恢复密钥
  | 'external_drive'  // 外部驱动器
  | 'import_export'   // 军规加密导入导出
  | 'settings'        // 系统设置与安全控制中心
  | VaultCategory;

/**
 * 遗产继承计划全局配置模型
 */
export interface HeritagePlanConfig {
  /** 继承人姓名 */
  heirName: string;
  /** 继承人联系方式 (邮箱/电话) */
  heirContact: string;
  /** 继承人专属嘱托与指导建议 */
  heirNotes: string;
  /** 继承计划有效期天数 (如 365 天) */
  expiryDays: number;
  /** 计划失效时间戳 (秒级，超出该时间离线引擎将密码学拒绝) */
  expiryTimestamp: number;
  /** 继承人公钥哈希 (SHA-256，与 config.bin 一致) */
  serverHashHex?: string;
  /** 所有者 X25519 公钥 (Hex 编码) */
  userPublicHex?: string;
  /** 继承人 X25519 公钥 (Hex 编码) */
  heirPublicHex?: string;
  /** 计划是否已完成初始化配置 */
  isConfigured: boolean;
  /** 当前活跃世代号 */
  activeGeneration?: number;
  /** 继承人列表 */
  heirList?: HeirRecord[];
  /** 双钥匙 PIN 码与硬件防护参数 */
  usbPasswordConfig?: UsbPasswordConfig;
}

/**
 * 操作系统探测到的外部物理驱动器模型 (Windows / macOS / Linux)
 */
export interface UsbDrive {
  /** 物理挂载根路径 (如 "D:\\" 或 "/Volumes/ExtDisk") */
  mountPath: string;
  /** 设备展示名称 */
  name: string;
  /** 驱动器卷标 (Label) */
  volumeLabel?: string;
  /** 盘符标识 (如 "D:") */
  driveLetter?: string;
  /** 是否存在所有者钥匙文件 (user-key.bin) */
  hasUserKey: boolean;
  /** 是否存在继承人钥匙文件 (heir-key.bin) */
  hasHeirKey: boolean;
  /** 是否存在继承配置文件 (config.bin) */
  hasConfig: boolean;
  /** 是否受到介质 PIN 密码保护 */
  hasPasswordProtected?: boolean;
  /** 介质类型 (UsbFlash / UsbSSD / UsbHDD) */
  mediaType?: MediaType;
  /** 驱动器总容量 (字节) */
  size?: number;
  /** 可用剩余空间 (字节) */
  freeSpace?: number;
  /** 文件系统类型 (NTFS / FAT32 / exFAT / APFS / ext4) */
  fileSystem?: string;
  /** 是否属于可移动介质 */
  isRemovable?: boolean;
  /** 是否属于外部总线设备 (USB) */
  isExternal?: boolean;
  /** 是否为操作系统安装盘 (如 C:) */
  isSystem?: boolean;
  /** 是否属于模拟仿真插槽测试介质 */
  isMock?: boolean;
  /** 物理介质卷序列号 (硬件绑定防克隆) */
  volumeSerialNumber?: string;
  /** 介质底层硬件指纹 (防强制跨盘转移) */
  deviceFingerprint?: string;
}

/**
 * 密码学密文容器模型 (LVCF 2.0 JSON 序列化)
 */
export interface EncryptedContainer {
  /** 容器格式版本号 */
  version: number;
  /** 12 字节 AES-256-GCM 随机 Nonce (Hex) */
  nonce_hex: string;
  /** 经过认证加密的密文字节流 (Hex) */
  ciphertext_hex: string;
  /** 继承配置校验参数 */
  config: {
    expiry_timestamp: number;
    server_hash_hex: string;
    created_at: number;
  };
  /** 所有者公钥 (Hex) */
  user_public_hex: string;
  /** 继承人公钥 (Hex) */
  heir_public_hex: string;
  /** 标准 LVCF 2.0 容器头信息 */
  lvcf_header?: LvcfHeader;
}

/**
 * 双介质联合解锁与验签状态模型
 */
export interface DualUnlockState {
  /** 主盘钥匙存在状态 */
  userKeyPresent: boolean;
  /** 主盘密钥文件绝对路径 */
  userKeyPath?: string;
  /** 主盘公钥 Hex */
  userPublicHex?: string;

  /** 副盘钥匙存在状态 */
  heirKeyPresent: boolean;
  /** 副盘密钥文件绝对路径 */
  heirKeyPath?: string;
  /** 副盘公钥 Hex */
  heirPublicHex?: string;

  /** 配置文件存在状态 */
  configPresent: boolean;
  /** 配置文件绝对路径 */
  configPath?: string;
  /** 计划过期时间戳 */
  expiryTimestamp?: number;

  /** 是否已过期 */
  isExpired: boolean;
  /** 继承人公钥哈希与 config.bin 是否精确匹配 */
  isHashMatched: boolean;
  /** 是否已满足双盘联合激活条件 (两盘齐备 + 未过期 + 哈希一致) */
  canUnlock: boolean;
  /** 是否已成功完成联合解锁 */
  isUnlocked: boolean;
  /** 错误信息 */
  error?: string;
}
