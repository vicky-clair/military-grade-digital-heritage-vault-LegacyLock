use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{bail, Context, Result};
use chrono::Utc;
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use x25519_dalek::{PublicKey, StaticSecret};

pub type X25519Secret = [u8; 32];
pub type X25519Public = [u8; 32];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultPlanConfig {
    pub expiry_timestamp: i64,
    pub server_hash_hex: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedVaultContainer {
    pub version: u32,
    pub nonce_hex: String,
    pub ciphertext_hex: String,
    pub config: VaultPlanConfig,
    pub user_public_hex: String,
    pub heir_public_hex: String,
}

/// 1. 生成 X25519 密钥对 (私钥 32 字节, 公钥 32 字节)
pub fn generate_keypair() -> (X25519Secret, X25519Public) {
    let secret = StaticSecret::random_from_rng(OsRng);
    let public = PublicKey::from(&secret);
    (secret.to_bytes(), public.to_bytes())
}

/// 计算 SHA-256 哈希
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// 2. 写入用户 U 盘密钥文件 (user-key.bin)
pub fn write_user_usb(secret: X25519Secret, public: X25519Public, path: &Path) -> Result<()> {
    let mut file = File::create(path)
        .with_context(|| format!("无法创建用户U盘密钥文件: {:?}", path))?;
    file.write_all(&secret)?;
    file.write_all(&public)?;
    file.flush()?;
    Ok(())
}

/// 3. 写入继承人 U 盘密钥文件 (heir-key.bin)
pub fn write_heir_usb(secret: X25519Secret, public: X25519Public, path: &Path) -> Result<()> {
    let mut file = File::create(path)
        .with_context(|| format!("无法创建继承人U盘密钥文件: {:?}", path))?;
    file.write_all(&secret)?;
    file.write_all(&public)?;
    file.flush()?;
    Ok(())
}

/// 读取 64 字节的 U 盘密钥文件 (32 字节私钥 + 32 字节公钥)
pub fn read_key_file(path: &Path) -> Result<(X25519Secret, X25519Public)> {
    let mut file = File::open(path)
        .with_context(|| format!("无法读取密钥文件: {:?}", path))?;
    let mut buf = [0u8; 64];
    file.read_exact(&mut buf)
        .with_context(|| format!("密钥文件长度不足 64 字节: {:?}", path))?;
    
    let mut secret = [0u8; 32];
    let mut public = [0u8; 32];
    secret.copy_from_slice(&buf[0..32]);
    public.copy_from_slice(&buf[32..64]);
    Ok((secret, public))
}

/// 4. 写入配置 (失效时间戳 + 服务器校验哈希)
pub fn write_config(expiry_timestamp: i64, server_hash: [u8; 32], path: &Path) -> Result<()> {
    let mut file = File::create(path)
        .with_context(|| format!("无法创建配置文件: {:?}", path))?;
    let mut buf = Vec::with_capacity(40);
    buf.extend_from_slice(&expiry_timestamp.to_le_bytes());
    buf.extend_from_slice(&server_hash);
    file.write_all(&buf)?;
    file.flush()?;
    Ok(())
}

/// 读取配置文件 (8 字节时间戳 + 32 字节哈希)
pub fn read_config(path: &Path) -> Result<(i64, [u8; 32])> {
    let mut file = File::open(path)
        .with_context(|| format!("无法读取配置文件: {:?}", path))?;
    let mut buf = [0u8; 40];
    file.read_exact(&mut buf)
        .with_context(|| format!("配置文件长度不足 40 字节: {:?}", path))?;
    
    let mut ts_bytes = [0u8; 8];
    ts_bytes.copy_from_slice(&buf[0..8]);
    let expiry = i64::from_le_bytes(ts_bytes);
    
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&buf[8..40]);
    Ok((expiry, hash))
}

/// 通过双向 Diffie-Hellman 派生对称加密密钥
pub fn derive_shared_encryption_key(
    user_secret: &X25519Secret,
    heir_public: &X25519Public,
) -> [u8; 32] {
    let secret = StaticSecret::from(*user_secret);
    let public = PublicKey::from(*heir_public);
    let dh_shared = secret.diffie_hellman(&public);
    
    // 使用 SHA-256 对 DH 共享密钥进行前向强化
    sha256(dh_shared.as_bytes())
}

/// 加密数字资产库 (AES-256-GCM)
pub fn encrypt_vault_data(
    plaintext: &[u8],
    user_secret: &X25519Secret,
    heir_public: &X25519Public,
    expiry_timestamp: i64,
    server_hash: [u8; 32],
) -> Result<EncryptedVaultContainer> {
    let user_sec = StaticSecret::from(*user_secret);
    let user_pub = PublicKey::from(&user_sec).to_bytes();
    
    let sym_key = derive_shared_encryption_key(user_secret, heir_public);
    let cipher = Aes256Gcm::new_from_slice(&sym_key)
        .map_err(|e| anyhow::anyhow!("AES 初始化失败: {}", e))?;
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| anyhow::anyhow!("加密失败: {}", e))?;
    
    Ok(EncryptedVaultContainer {
        version: 1,
        nonce_hex: hex::encode(nonce_bytes),
        ciphertext_hex: hex::encode(ciphertext),
        config: VaultPlanConfig {
            expiry_timestamp,
            server_hash_hex: hex::encode(server_hash),
            created_at: Utc::now().timestamp(),
        },
        user_public_hex: hex::encode(user_pub),
        heir_public_hex: hex::encode(heir_public),
    })
}

/// 5. 解锁验证并解密数字资产 (必须同时插上两个U盘)
pub fn unlock_and_decrypt(
    user_secret: &X25519Secret,
    user_public: &X25519Public,
    heir_secret: &X25519Secret,
    heir_public: &X25519Public,
    expiry_timestamp: i64,
    server_hash: [u8; 32],
    container: &EncryptedVaultContainer,
) -> Result<Vec<u8>> {
    let now = Utc::now().timestamp();
    if now > expiry_timestamp {
        bail!("【安全拦截】继承计划已失效！当前时间戳 ({}) 已超过有效截止时间 ({})", now, expiry_timestamp);
    }
    
    // 验证继承人公钥哈希与服务器/配置哈希是否匹配
    let computed_heir_hash = sha256(heir_public);
    if computed_heir_hash != server_hash {
        bail!("【安全拦截】继承人U盘公钥哈希与服务器凭据不一致，拒绝解锁！");
    }
    
    // 验证用户公钥与私钥配对
    let derived_user_pub = PublicKey::from(&StaticSecret::from(*user_secret)).to_bytes();
    if &derived_user_pub != user_public {
        bail!("【安全拦截】用户U盘私钥与公钥校验不匹配！");
    }
    
    // 验证继承人公钥与私钥配对
    let derived_heir_pub = PublicKey::from(&StaticSecret::from(*heir_secret)).to_bytes();
    if &derived_heir_pub != heir_public {
        bail!("【安全拦截】继承人U盘私钥与公钥校验不匹配！");
    }
    
    // 派生双钥匙共享解密密钥: DH(user_secret, heir_public) == DH(heir_secret, user_public)
    let sym_key_from_user = derive_shared_encryption_key(user_secret, heir_public);
    
    let heir_sec = StaticSecret::from(*heir_secret);
    let user_pub_point = PublicKey::from(*user_public);
    let dh_from_heir = heir_sec.diffie_hellman(&user_pub_point);
    let sym_key_from_heir = sha256(dh_from_heir.as_bytes());
    
    if sym_key_from_user != sym_key_from_heir {
        bail!("【密码学异常】双U盘 Diffie-Hellman 密钥协商不一致！");
    }
    
    let cipher = Aes256Gcm::new_from_slice(&sym_key_from_user)
        .map_err(|e| anyhow::anyhow!("AES 初始化失败: {}", e))?;
    
    let nonce_bytes = hex::decode(&container.nonce_hex)
        .context("解析 Nonce 失败")?;
    let ciphertext = hex::decode(&container.ciphertext_hex)
        .context("解析密文失败")?;
    
    let nonce = Nonce::from_slice(&nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|e| anyhow::anyhow!("【解密失败】密文校验未通过或密钥不正确: {}", e))?;
    
    Ok(plaintext)
}
