use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VaultItemCategory {
    Login,
    Note,
    Card,
    Identity,
    Game,
    License,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultField {
    pub name: String,
    pub value: String,
    pub is_secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultItem {
    pub id: String,
    pub title: String,
    pub category: VaultItemCategory,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: Vec<VaultField>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeritageVaultData {
    pub vault_name: String,
    pub owner_name: String,
    pub heir_name: String,
    pub instructions: String,
    pub items: Vec<VaultItem>,
    pub export_timestamp: i64,
}
