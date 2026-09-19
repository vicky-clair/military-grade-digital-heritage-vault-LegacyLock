//! ============================================================================
//! LegacyLock 军规遗产密钥库 — 核心数据结构与序列化模型 (Vault Models)
//! ============================================================================
//! 
//! 本模块定义 Rust 密码学核心处理的资产实体结构，与前端 LVCF 2.0 规范保持二进制与 JSON 字段对齐。

use serde::{Deserialize, Serialize};

/// 自定义扩展凭据字段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultField {
    /// 字段显示名称
    pub name: String,
    /// 字段实际内容
    pub value: String,
    /// 是否属于敏感保密字段 (如密码、助记词)
    #[serde(default)]
    pub is_secret: bool,
}

/// 资产项目核心模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultItem {
    /// 资产唯一 ID
    pub id: String,
    /// 资产标题
    pub title: String,
    /// 资产分类标识 (login, card, cryptoWallet 等)
    pub category: String,
    /// 账号 / 用户名
    pub username: Option<String>,
    /// 密码 / 私钥
    pub password: Option<String>,
    /// 关联网址
    pub url: Option<String>,
    /// 备注说明
    pub notes: Option<String>,
    /// 继承人专属交接指引
    pub inheritance_instructions: Option<String>,
    /// 自定义键值对列表
    #[serde(default)]
    pub custom_fields: Vec<VaultField>,
    /// 创建时间戳 (秒级)
    pub created_at: i64,
    /// 修改时间戳 (秒级)
    pub updated_at: i64,
    /// 单调递增修订版本号 (防回滚攻击)
    pub revision: Option<u64>,
}

/// 密库顶层聚合数据载荷 (Payload)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeritageVaultData {
    /// 密库名称
    pub vault_name: String,
    /// 所有者姓名
    pub owner_name: String,
    /// 法定继承人姓名
    pub heir_name: String,
    /// 继承总体嘱托与说明
    pub instructions: String,
    /// 资产项目列表
    pub items: Vec<VaultItem>,
    /// 导出时间戳
    pub export_timestamp: i64,
    /// 世代序列号
    pub sequence: Option<u64>,
}
