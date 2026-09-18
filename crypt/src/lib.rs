pub mod crypto;
pub mod vault;

pub use crypto::*;
pub use vault::*;

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_keypair_generation_and_dh() {
        let (user_sec, user_pub) = generate_keypair();
        let (heir_sec, heir_pub) = generate_keypair();

        let key1 = derive_shared_encryption_key(&user_sec, &heir_pub);
        let key2 = derive_shared_encryption_key(&heir_sec, &user_pub);

        assert_eq!(key1, key2, "Diffie-Hellman 派生密钥必须完全相同");
    }

    #[test]
    fn test_vault_encryption_and_dual_usb_unlock() {
        let (user_sec, user_pub) = generate_keypair();
        let (heir_sec, heir_pub) = generate_keypair();

        let expiry = Utc::now().timestamp() + 86400 * 365; // 1 年后
        let server_hash = sha256(&heir_pub);

        let secret_message = "{\"message\":\"LegacyLock 军规遗产密码库 - Steam: 123456\"}".as_bytes();

        // 加密
        let container = encrypt_vault_data(
            secret_message,
            &user_sec,
            &heir_pub,
            expiry,
            server_hash,
        ).expect("加密应成功");

        // 联合解锁 (两个U盘同时插上)
        let decrypted = unlock_and_decrypt(
            &user_sec,
            &user_pub,
            &heir_sec,
            &heir_pub,
            expiry,
            server_hash,
            &container,
        ).expect("双U盘在场时解锁应成功");

        assert_eq!(decrypted, secret_message);
    }

    #[test]
    fn test_expired_plan_rejected() {
        let (user_sec, user_pub) = generate_keypair();
        let (heir_sec, heir_pub) = generate_keypair();

        let past_expiry = Utc::now().timestamp() - 3600; // 1小时前已过期
        let server_hash = sha256(&heir_pub);

        let secret_message = b"Secret Heritage Data";
        let container = encrypt_vault_data(
            secret_message,
            &user_sec,
            &heir_pub,
            past_expiry,
            server_hash,
        ).expect("加密容器生成");

        let result = unlock_and_decrypt(
            &user_sec,
            &user_pub,
            &heir_sec,
            &heir_pub,
            past_expiry,
            server_hash,
            &container,
        );

        assert!(result.is_err(), "已过期的继承计划必须拒绝解锁");
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("失效") || err_msg.contains("超过"));
    }

    #[test]
    fn test_wrong_heir_key_rejected() {
        let (user_sec, user_pub) = generate_keypair();
        let (_heir_sec, heir_pub) = generate_keypair();
        let (fake_sec, fake_pub) = generate_keypair();

        let expiry = Utc::now().timestamp() + 86400 * 30;
        let server_hash = sha256(&heir_pub);

        let secret_message = b"Confidential Assets";
        let container = encrypt_vault_data(
            secret_message,
            &user_sec,
            &heir_pub,
            expiry,
            server_hash,
        ).expect("加密");

        // 使用假继承人密钥尝试解锁
        let result = unlock_and_decrypt(
            &user_sec,
            &user_pub,
            &fake_sec,
            &fake_pub,
            expiry,
            server_hash,
            &container,
        );

        assert!(result.is_err(), "非授权继承人U盘必须被拦截拒绝");
    }
}
