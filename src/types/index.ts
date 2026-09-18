export type VaultCategory =
  | 'login'
  | 'note'
  | 'card'
  | 'identity'
  | 'password'
  | 'document'
  | 'sshKey'
  | 'apiCredential'
  | 'membership'
  | 'cryptoWallet'
  | 'medical'
  | 'reward'
  | 'outdoorLicense'
  | 'passport'
  | 'database'
  | 'router'
  | 'server'
  | 'email'
  | 'ssn'
  | 'softwareLicense'
  | 'bankAccount'
  | 'driverLicense'
  | 'game'
  | 'license';

export interface VaultField {
  id: string;
  name: string;
  value: string;
  isSecret: boolean;
}

export interface VaultItem {
  id: string;
  title: string;
  category: VaultCategory;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  customFields?: VaultField[];
  inheritanceInstructions?: string; // 继承人接管说明与指引 (Doc v2 Section 42)
  revision?: number;                // 修订版本计数 (Doc v2 Section 13)
  createdAt: number;
  updatedAt: number;
}

// 工作模式：所有者模式 (读写管理) vs 继承人只读恢复模式 (Doc v2 Section 4, 5)
export type OperatingMode = 'OWNER' | 'HEIR_RECOVERY';

// LVCF 2.0 容器头 (Doc v2 Section 9, 10, 11)
export interface LvcfHeader {
  magic: 'LEGACYLOCK';
  container: 'LVCF';
  format_version: '2.0';
  minimum_reader_version: '1.0';
  vault_id: string;
  role: 'OWNER' | 'HEIR';
  sequence: number;
  generation: number;
  created_at: string;
  updated_at: string;
  cipher_suite: 'LLCS-1';
  manifest_hash_hex: string;
  owner_signature_hex: string;
}

// 介质类型抽象 (SMAL - Doc v2 Section 8)
export type MediaType =
  | 'UsbFlash'
  | 'UsbSSD'
  | 'UsbHDD'
  | 'NvmeEnclosure'
  | 'SDCard'
  | 'MicroSD'
  | 'OtherRemovable';

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

// 保险库健康检查报告 (Doc v2 Section 32, 33)
export interface VaultHealthReport {
  status: 'Healthy' | 'Warning' | 'Damaged' | 'RecoveryRequired';
  score: number;
  overallScore?: number;
  vaultId?: string;
  headerVerified: boolean;
  signatureVerified: boolean;
  objectHashVerified: boolean;
  antiRollbackVerified: boolean;
  keySlotVerified: boolean;
  offlineRescuePresent: boolean;
  issues: string[];
  lastCheckedAt: number;
}

// 继承人介质管理记录 (Doc v2 Section 25, 26, 36, 37)
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

export interface UsbPasswordConfig {
  hasMasterPassword: boolean;
  masterPasswordHint?: string;
  hasHeirPassword: boolean;
  heirPasswordHint?: string;
  autoLockMinutes: number;
  lastChangedAt?: number;
  isHardwareEncrypted: boolean;
}

export type NavCategoryType =
  | 'all'
  | 'registry'
  | 'browser'
  | 'network'
  | 'mail'
  | 'wifi'
  | 'bitlocker'
  | 'external_drive'
  | 'import_export'
  | 'settings'
  | VaultCategory;

export interface HeritagePlanConfig {
  heirName: string;
  heirContact: string;
  heirNotes: string;
  expiryDays: number;
  expiryTimestamp: number;
  serverHashHex?: string;
  userPublicHex?: string;
  heirPublicHex?: string;
  isConfigured: boolean;
  activeGeneration?: number;
  heirList?: HeirRecord[];
  usbPasswordConfig?: UsbPasswordConfig;
}

export interface UsbDrive {
  mountPath: string;
  name: string;
  volumeLabel?: string;
  driveLetter?: string;
  hasUserKey: boolean;
  hasHeirKey: boolean;
  hasConfig: boolean;
  hasPasswordProtected?: boolean;
  mediaType?: MediaType;
  size?: number;
  freeSpace?: number;
  fileSystem?: string;
  isRemovable?: boolean;
  isExternal?: boolean;
  isSystem?: boolean;
  isMock?: boolean;
}

export interface EncryptedContainer {
  version: number;
  nonce_hex: string;
  ciphertext_hex: string;
  config: {
    expiry_timestamp: number;
    server_hash_hex: string;
    created_at: number;
  };
  user_public_hex: string;
  heir_public_hex: string;
  lvcf_header?: LvcfHeader;
}

export interface DualUnlockState {
  userKeyPresent: boolean;
  userKeyPath?: string;
  userPublicHex?: string;

  heirKeyPresent: boolean;
  heirKeyPath?: string;
  heirPublicHex?: string;

  configPresent: boolean;
  configPath?: string;
  expiryTimestamp?: number;

  isExpired: boolean;
  isHashMatched: boolean;
  canUnlock: boolean;
  isUnlocked: boolean;
  error?: string;
}
