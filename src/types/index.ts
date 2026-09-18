export type VaultCategory = 'login' | 'note' | 'card' | 'identity' | 'game' | 'license';

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
  createdAt: number;
  updatedAt: number;
}

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
}

export interface UsbDrive {
  mountPath: string;
  name: string;
  hasUserKey: boolean;
  hasHeirKey: boolean;
  hasConfig: boolean;
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
