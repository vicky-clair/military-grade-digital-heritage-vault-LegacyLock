use anyhow::{Context, Result};
use chrono::Utc;
use clap::{Parser, Subcommand};
use std::fs;
use std::path::PathBuf;
use vault_core::crypto::*;

#[derive(Parser)]
#[command(name = "vault-cli")]
#[command(about = "LegacyLock 军规级数字遗产保险箱核心密码工具", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 1. 生成双U盘密钥与配置文件
    GenerateKeys {
        /// 用户U盘密钥文件输出路径 (user-key.bin)
        #[arg(long, default_value = "user-key.bin")]
        user_out: PathBuf,

        /// 继承人U盘密钥文件输出路径 (heir-key.bin)
        #[arg(long, default_value = "heir-key.bin")]
        heir_out: PathBuf,

        /// 继承配置输出路径 (config.bin)
        #[arg(long, default_value = "config.bin")]
        config_out: PathBuf,

        /// 继承计划有效期天数
        #[arg(long, default_value_t = 365)]
        expiry_days: i64,
    },

    /// 2. 加密数字资产库 (写入AES-256-GCM密文)
    Encrypt {
        /// 用户U盘密钥文件
        #[arg(long)]
        user_key: PathBuf,

        /// 继承人U盘密钥文件
        #[arg(long)]
        heir_key: PathBuf,

        /// 配置文件 (config.bin)
        #[arg(long)]
        config: PathBuf,

        /// 待加密的明文 JSON 资产库路径
        #[arg(long)]
        input: PathBuf,

        /// 加密后的密文容器输出路径
        #[arg(long, default_value = "vault.locked")]
        output: PathBuf,
    },

    /// 3. 双U盘同时插电脑联合解锁并解密
    Unlock {
        /// 用户U盘密钥文件
        #[arg(long)]
        user_key: PathBuf,

        /// 继承人U盘密钥文件
        #[arg(long)]
        heir_key: PathBuf,

        /// 配置文件 (config.bin)
        #[arg(long)]
        config: PathBuf,

        /// 密文容器路径
        #[arg(long, default_value = "vault.locked")]
        vault: PathBuf,

        /// 解密后资产输出文件 (未指定则输出到标准输出)
        #[arg(long)]
        output: Option<PathBuf>,
    },

    /// 4. 验证双U盘与配置的合法性与时效
    Verify {
        #[arg(long)]
        user_key: PathBuf,

        #[arg(long)]
        heir_key: PathBuf,

        #[arg(long)]
        config: PathBuf,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::GenerateKeys {
            user_out,
            heir_out,
            config_out,
            expiry_days,
        } => {
            let (user_sec, user_pub) = generate_keypair();
            let (heir_sec, heir_pub) = generate_keypair();

            let expiry_ts = Utc::now().timestamp() + (expiry_days * 86400);
            let server_hash = sha256(&heir_pub);

            write_user_usb(user_sec, user_pub, &user_out)?;
            write_heir_usb(heir_sec, heir_pub, &heir_out)?;
            write_config(expiry_ts, server_hash, &config_out)?;

            let result = serde_json::json!({
                "status": "success",
                "message": "双U盘密钥与配置文件已成功生成",
                "user_key_file": user_out.display().to_string(),
                "heir_key_file": heir_out.display().to_string(),
                "config_file": config_out.display().to_string(),
                "user_public_hex": hex::encode(user_pub),
                "heir_public_hex": hex::encode(heir_pub),
                "server_hash_hex": hex::encode(server_hash),
                "expiry_timestamp": expiry_ts,
                "expiry_utc": chrono::DateTime::from_timestamp(expiry_ts, 0).map(|dt| dt.to_rfc3339()),
            });

            println!("{}", serde_json::to_string_pretty(&result)?);
        }

        Commands::Encrypt {
            user_key,
            heir_key,
            config,
            input,
            output,
        } => {
            let (user_sec, _) = read_key_file(&user_key)
                .with_context(|| format!("读取用户密钥失败: {:?}", user_key))?;
            let (_, heir_pub) = read_key_file(&heir_key)
                .with_context(|| format!("读取继承人密钥失败: {:?}", heir_key))?;
            let (expiry, server_hash) = read_config(&config)
                .with_context(|| format!("读取配置文件失败: {:?}", config))?;

            let plaintext = fs::read(&input)
                .with_context(|| format!("读取输入资产明文文件失败: {:?}", input))?;

            let container = encrypt_vault_data(
                &plaintext,
                &user_sec,
                &heir_pub,
                expiry,
                server_hash,
            )?;

            let json_str = serde_json::to_string_pretty(&container)?;
            fs::write(&output, json_str)
                .with_context(|| format!("写入密文容器失败: {:?}", output))?;

            let result = serde_json::json!({
                "status": "success",
                "message": "资产库军规加密完成",
                "output_file": output.display().to_string(),
                "expiry_timestamp": expiry,
            });
            println!("{}", serde_json::to_string_pretty(&result)?);
        }

        Commands::Unlock {
            user_key,
            heir_key,
            config,
            vault,
            output,
        } => {
            let (user_sec, user_pub) = read_key_file(&user_key)
                .with_context(|| format!("无法读取用户U盘密钥: {:?}", user_key))?;
            let (heir_sec, heir_pub) = read_key_file(&heir_key)
                .with_context(|| format!("无法读取继承人U盘密钥: {:?}", heir_key))?;
            let (expiry, server_hash) = read_config(&config)
                .with_context(|| format!("无法读取配置文件: {:?}", config))?;

            let container_str = fs::read_to_string(&vault)
                .with_context(|| format!("无法读取密文容器: {:?}", vault))?;
            let container: EncryptedVaultContainer = serde_json::from_str(&container_str)
                .with_context(|| "密文容器格式损坏或无效")?;

            let decrypted_bytes = unlock_and_decrypt(
                &user_sec,
                &user_pub,
                &heir_sec,
                &heir_pub,
                expiry,
                server_hash,
                &container,
            )?;

            if let Some(out_path) = output {
                fs::write(&out_path, &decrypted_bytes)
                    .with_context(|| format!("写入解密数据到 {:?} 失败", out_path))?;
                println!(
                    "{}",
                    serde_json::json!({
                        "status": "success",
                        "message": "双U盘联合解锁成功，数据已解密导出",
                        "output_file": out_path.display().to_string(),
                    })
                );
            } else {
                let decrypted_text = String::from_utf8(decrypted_bytes)
                    .unwrap_or_else(|_| "[Binary Data Decrypted]".to_string());
                println!("{}", decrypted_text);
            }
        }

        Commands::Verify {
            user_key,
            heir_key,
            config,
        } => {
            let (_, user_pub) = read_key_file(&user_key)?;
            let (_, heir_pub) = read_key_file(&heir_key)?;
            let (expiry, server_hash) = read_config(&config)?;

            let now = Utc::now().timestamp();
            let is_expired = now > expiry;
            let computed_hash = sha256(&heir_pub);
            let hash_matched = computed_hash == server_hash;

            let result = serde_json::json!({
                "status": if !is_expired && hash_matched { "valid" } else { "invalid" },
                "user_key_present": true,
                "heir_key_present": true,
                "user_public_hex": hex::encode(user_pub),
                "heir_public_hex": hex::encode(heir_pub),
                "is_expired": is_expired,
                "current_timestamp": now,
                "expiry_timestamp": expiry,
                "hash_matched": hash_matched,
            });

            println!("{}", serde_json::to_string_pretty(&result)?);
        }
    }

    Ok(())
}
