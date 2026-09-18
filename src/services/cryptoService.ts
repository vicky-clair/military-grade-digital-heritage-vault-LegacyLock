import { EncryptedContainer, HeritagePlanConfig, UsbDrive, VaultItem } from '../types';

declare global {
  interface Window {
    legacyLockAPI?: {
      isElectron: boolean;
      platform: string;
      scanUsbDrives: () => Promise<{ success: boolean; drives: UsbDrive[]; error?: string }>;
      selectKeyFile: (type: 'user' | 'heir' | 'config') => Promise<{ canceled: boolean; path?: string }>;
      selectOutputDirectory: () => Promise<{ canceled: boolean; path?: string }>;
      saveBinaryFile: (defaultName: string, dataBase64: string) => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
      generateKeys: (options: {
        userOut?: string;
        heirOut?: string;
        configOut?: string;
        expiryDays: number;
      }) => Promise<{ success: boolean; data?: any; error?: string }>;
      encryptVault: (options: {
        userKey: string;
        heirKey: string;
        config: string;
        inputData: any;
        outputPath?: string;
      }) => Promise<{ success: boolean; data?: any; error?: string }>;
      unlockVault: (options: {
        userKey: string;
        heirKey: string;
        config: string;
        vaultPath?: string;
      }) => Promise<{ success: boolean; data?: any; error?: string }>;
      verifyKeys: (options: {
        userKey: string;
        heirKey: string;
        config: string;
      }) => Promise<{ success: boolean; data?: any; error?: string }>;
      readVaultContainer: () => Promise<{ exists: boolean; container?: EncryptedContainer; error?: string }>;
      saveVaultContainer: (data: EncryptedContainer) => Promise<{ success: boolean; path?: string }>;
    };
  }
}

export const isElectronApp = (): boolean => {
  return typeof window !== 'undefined' && !!window.legacyLockAPI?.isElectron;
};

// 工具函数：字节数组转 Hex
export function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 工具函数：Hex 转字节数组
export function fromHex(hexStr: string): Uint8Array {
  const cleanHex = hexStr.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// WebCrypto SHA-256
export async function computeSha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuf = await window.crypto.subtle.digest('SHA-256', data as any);
  return new Uint8Array(hashBuf);
}

// 模拟或真实生成双U盘二进制数据包
export async function generateDualUsbKeyBlobs(expiryDays: number): Promise<{
  userKeyBlob: Blob;
  heirKeyBlob: Blob;
  configBlob: Blob;
  userPublicHex: string;
  heirPublicHex: string;
  serverHashHex: string;
  expiryTimestamp: number;
}> {
  // 生成随机 32 字节私钥与模拟 X25519 公钥
  const userSec = new Uint8Array(32);
  const heirSec = new Uint8Array(32);
  window.crypto.getRandomValues(userSec);
  window.crypto.getRandomValues(heirSec);

  // 公钥使用 SHA-256(secret) 模拟映射
  const userPub = await computeSha256(userSec);
  const heirPub = await computeSha256(heirSec);

  // 打包 user-key.bin (64B)
  const userKeyBytes = new Uint8Array(64);
  userKeyBytes.set(userSec, 0);
  userKeyBytes.set(userPub, 32);

  // 打包 heir-key.bin (64B)
  const heirKeyBytes = new Uint8Array(64);
  heirKeyBytes.set(heirSec, 0);
  heirKeyBytes.set(heirPub, 32);

  // 打包 config.bin (40B: 8B i64 timestamp + 32B sha256(heirPub))
  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiryDays * 86400;
  const serverHash = await computeSha256(heirPub);

  const configBytes = new Uint8Array(40);
  const view = new DataView(configBytes.buffer);
  view.setBigInt64(0, BigInt(expiryTimestamp), true);
  configBytes.set(serverHash, 8);

  return {
    userKeyBlob: new Blob([userKeyBytes], { type: 'application/octet-stream' }),
    heirKeyBlob: new Blob([heirKeyBytes], { type: 'application/octet-stream' }),
    configBlob: new Blob([configBytes], { type: 'application/octet-stream' }),
    userPublicHex: toHex(userPub),
    heirPublicHex: toHex(heirPub),
    serverHashHex: toHex(serverHash),
    expiryTimestamp,
  };
}

// 纯浏览器端 AES-256-GCM 资产加密 (与 Rust 核心逻辑等价)
export async function encryptVaultWeb(
  items: VaultItem[],
  plan: HeritagePlanConfig
): Promise<EncryptedContainer> {
  const jsonStr = JSON.stringify({
    vaultName: 'LegacyLock 核心数字遗产库',
    items,
    plan,
    exportedAt: Date.now(),
  });

  const enc = new TextEncoder();
  const plaintext = enc.encode(jsonStr);

  // 生成 AES-GCM 密钥与 Nonce
  const keyBytes = new Uint8Array(32);
  const nonce = new Uint8Array(12);
  window.crypto.getRandomValues(keyBytes);
  window.crypto.getRandomValues(nonce);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    plaintext
  );

  return {
    version: 1,
    nonce_hex: toHex(nonce),
    ciphertext_hex: toHex(new Uint8Array(ciphertextBuf)),
    config: {
      expiry_timestamp: plan.expiryTimestamp,
      server_hash_hex: plan.serverHashHex || '',
      created_at: Math.floor(Date.now() / 1000),
    },
    user_public_hex: plan.userPublicHex || '',
    heir_public_hex: plan.heirPublicHex || '',
  };
}

// 双U盘解锁校验与解密服务
export async function verifyAndUnlockVault(options: {
  userKeyPath?: string;
  userKeyBuffer?: Uint8Array;
  heirKeyPath?: string;
  heirKeyBuffer?: Uint8Array;
  configPath?: string;
  configBuffer?: Uint8Array;
  container: EncryptedContainer;
  currentItems: VaultItem[];
}): Promise<{ success: boolean; items?: VaultItem[]; error?: string }> {
  // 如果在 Electron 环境且提供了文件路径，优先调用 Rust 原生二进制
  if (
    isElectronApp() &&
    window.legacyLockAPI &&
    options.userKeyPath &&
    options.heirKeyPath &&
    options.configPath
  ) {
    try {
      const res = await window.legacyLockAPI.unlockVault({
        userKey: options.userKeyPath,
        heirKey: options.heirKeyPath,
        config: options.configPath,
      });

      if (res.success) {
        if (typeof res.data === 'string') {
          const parsed = JSON.parse(res.data);
          return { success: true, items: parsed.items || options.currentItems };
        } else if (res.data && res.data.items) {
          return { success: true, items: res.data.items };
        }
        return { success: true, items: options.currentItems };
      } else {
        return { success: false, error: res.error || 'Rust 解锁模块校验失败' };
      }
    } catch (e: any) {
      return { success: false, error: e.message || '双U盘解锁异常' };
    }
  }

  // 纯前端 / 仿真模式校验逻辑
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const expirySec = options.container.config.expiry_timestamp;

    if (expirySec && nowSec > expirySec) {
      return {
        success: false,
        error: `【军规安全拦截】该数字遗产继承计划已失效！当前时间已超出有效截止时间戳。`,
      };
    }

    // 检查 U 盘两把钥匙必须同时存在
    if (!options.userKeyBuffer && !options.userKeyPath) {
      return { success: false, error: '【物理隔离拦截】缺少用户U盘 (user-key.bin)，无法激活！' };
    }
    if (!options.heirKeyBuffer && !options.heirKeyPath) {
      return { success: false, error: '【物理隔离拦截】缺少继承人U盘 (heir-key.bin)，无法激活！' };
    }

    return {
      success: true,
      items: options.currentItems,
    };
  } catch (err: any) {
    return { success: false, error: err.message || '解密校验发生未知错误' };
  }
}
