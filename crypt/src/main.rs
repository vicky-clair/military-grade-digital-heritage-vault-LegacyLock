//! Read-only recovery for historical Rust v1 containers. Not an LVCF 3 writer.
use anyhow::{bail, Context, Result};
use clap::{Parser, Subcommand};
use std::{fs::{File, OpenOptions}, io::{Read, Write}, path::PathBuf};
use vault_core::crypto::*;

#[derive(Parser)]
#[command(name="vault-cli", about="LegacyLock 历史 Rust v1 只读恢复工具；新密库请使用 LVCF 3")]
struct Cli { #[command(subcommand)] command: Commands }
#[derive(Subcommand)]
enum Commands {
    /// 恢复旧数据。历史协议不具有真正的双秘密保护，不能用于创建新密库。
    Unlock {
        #[arg(long)] user_key: PathBuf,
        #[arg(long)] heir_key: PathBuf,
        #[arg(long)] config: PathBuf,
        #[arg(long)] vault: PathBuf,
        /// 新明文文件路径；拒绝覆盖已有文件。
        #[arg(long)] output: PathBuf,
    }
}
fn main() -> Result<()> {
    match Cli::parse().command {
        Commands::Unlock {user_key, heir_key, config, vault, output} => {
            let (us,up)=read_key_file(&user_key)?;
            let (hs,hp)=read_key_file(&heir_key)?;
            let (expiry,hash)=read_config(&config)?;
            let mut bytes=Vec::new();
            File::open(&vault)?.take(32*1024*1024+1).read_to_end(&mut bytes)?;
            if bytes.len()>32*1024*1024 { bail!("旧容器超过 32 MB 上限"); }
            let container:EncryptedVaultContainer=serde_json::from_slice(&bytes).context("旧容器格式损坏")?;
            let plaintext=unlock_and_decrypt(&us,&up,&hs,&hp,expiry,hash,&container)?;
            let mut file=OpenOptions::new().write(true).create_new(true).open(&output).context("输出文件必须不存在")?;
            file.write_all(&plaintext)?;file.sync_all()?;
            eprintln!("已恢复历史数据。输出为明文；旧协议并非真正 2-of-2，且不能证明所有者签名。请保管原件并迁移至 LVCF 3。");
        }
    }
    Ok(())
}
