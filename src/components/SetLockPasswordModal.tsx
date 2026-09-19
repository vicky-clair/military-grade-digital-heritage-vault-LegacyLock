/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 首次使用锁屏密码初始化弹窗 (SetLockPasswordModal)
 * ============================================================================
 * 
 * 交互职责：
 * 1. 用户首次点击「立即锁屏」时，若尚未配置主密码，阻断直接无密锁屏，弹出此初始化向导；
 * 2. 引导用户设定 6~32 位军规高强度主密码 (Master PIN)；
 * 3. 实时提供密码强度指示器（长度、字母、数字、特殊字符军规评级）；
 * 4. 附带可选的密码离线提示词；
 * 5. 保存成功后，立即驱动全屏高斯模糊锁定 (LockScreen)。
 */

import React, { useState } from 'react';
import {
  Lock,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Key,
} from 'lucide-react';
import {
  hashPassword,
  generateSecretKey,
  computeSecretKeyHash,
  generateEmergencyKitContent,
} from '../services/cryptoService';
import { useI18n } from '../services/i18n';

interface SetLockPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    hashHex: string,
    saltHex: string,
    hint: string,
    secretKey: string,
    secretKeyHash: string
  ) => void;
  heirName?: string;
}

export const SetLockPasswordModal: React.FC<SetLockPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  heirName,
}) => {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secretKey, setSecretKey] = useState<string>(() => generateSecretKey());
  const [copiedKey, setCopiedKey] = useState(false);
  const [hasBackedUpSecretKey, setHasBackedUpSecretKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 军规密码强度计算
  const evaluateStrength = (pwd: string) => {
    if (!pwd) return { label: t('usbModal.strengthNone'), color: '#7E92C4', percent: 0 };
    if (pwd.length < 6) return { label: t('changePasswordModal.strengthTooShort'), color: '#F43F5E', percent: 20 };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
    const score = (pwd.length >= 8 ? 1 : 0) + (hasNum ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 4) return { label: t('changePasswordModal.strengthVeryStrong'), color: '#34D399', percent: 100 };
    if (score >= 3) return { label: t('changePasswordModal.strengthStrong'), color: '#60A5FA', percent: 75 };
    return { label: t('changePasswordModal.strengthMedium'), color: '#FBBF24', percent: 45 };
  };

  const strength = evaluateStrength(password);

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRegenerateSecretKey = () => {
    if (window.confirm(t('common.warning'))) {
      setSecretKey(generateSecretKey());
      setCopiedKey(false);
    }
  };

  // 下载 A4 紧急应急救援卡 (Emergency Kit)
  const handleDownloadEmergencyKit = () => {
    const kitText = generateEmergencyKitContent({
      secretKey,
      masterPasswordHint: hint.trim(),
      heirName: heirName || 'Legal Heir',
    });
    const blob = new Blob([new TextEncoder().encode(kitText)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LegacyLock_Emergency_Kit_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setHasBackedUpSecretKey(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password || password.length < 6) {
      setErrorMsg(t('setLockPasswordModal.lengthError'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t('setLockPasswordModal.mismatchError'));
      return;
    }

    if (!hasBackedUpSecretKey) {
      setErrorMsg(t('setLockPasswordModal.backupRequiredError'));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 执行主密码加盐哈希运算 (PBKDF2-100k)
      const { hashHex, saltHex } = await hashPassword(password);
      // 2. 计算 Secret Key 验签哈希
      const secKeyHash = await computeSecretKeyHash(secretKey);

      onSuccess(hashHex, saltHex, hint.trim(), secretKey, secKeyHash);
    } catch (err: any) {
      setErrorMsg(`${t('common.error')}: ${err.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9998 }}>
      <div
        className="modal-window-dialog"
        style={{ width: 540, maxWidth: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="modal-window-header">
          <div className="modal-window-title">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0572EC 0%, #7B2CBF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 114, 236, 0.35)',
                flexShrink: 0,
              }}
            >
              <Lock style={{ width: 18, height: 18, color: '#00D4FF' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{t('setLockPasswordModal.title')}</span>
                <span className="badge-pill purple" style={{ fontSize: 10.5, padding: '2px 8px' }}>LVCF 2.0</span>
              </div>
              <p className="modal-title-desc">
                {t('setLockPasswordModal.subtitle')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-window-close" title={t('common.cancel')}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 弹窗表单正文 */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="modal-window-body" style={{ flex: 1, padding: '20px 24px' }}>
            
            {/* ====== 1. 军规级紧急安全密钥 (Secret Key) 核心展示区 ====== */}
            <div
              style={{
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.15) 0%, rgba(5, 114, 236, 0.12) 100%)',
                border: '1px solid rgba(123, 44, 191, 0.35)',
                padding: '14px 16px',
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Key style={{ width: 16, height: 16, color: '#C084FC' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F3E8FF' }}>
                    {t('setLockPasswordModal.secretKeyTitle')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateSecretKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'transparent',
                    border: 'none',
                    color: '#C084FC',
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                  title="Generate New Key"
                >
                  <RefreshCw style={{ width: 12, height: 12 }} />
                  <span>Refresh</span>
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(10, 13, 20, 0.8)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(123, 44, 191, 0.25)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#00D4FF',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'all',
                }}
              >
                <span>{secretKey}</span>
                <button
                  type="button"
                  onClick={handleCopySecretKey}
                  style={{
                    background: copiedKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid ' + (copiedKey ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'),
                    color: copiedKey ? '#34D399' : '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {copiedKey ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  <span>{copiedKey ? t('setLockPasswordModal.copied') : t('setLockPasswordModal.copySecretKey')}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <p style={{ fontSize: 11, color: '#D8B4FE', margin: 0, lineHeight: 1.4 }}>
                  🛡️ {t('setLockPasswordModal.secretKeyNotice')}
                </p>
                <button
                  type="button"
                  onClick={handleDownloadEmergencyKit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(123, 44, 191, 0.3)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    color: '#F3E8FF',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  <span>{t('setLockPasswordModal.downloadEmergencyKit')}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 主密码输入 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                  {t('setLockPasswordModal.passLabel')} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('setLockPasswordModal.passPlaceholder')}
                    autoFocus
                    style={{
                      flex: 1,
                      height: 40,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: 13.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#8EA4D4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>

                {/* 密码强度条 */}
                {password && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#8EA4D4' }}>{t('usbModal.masterPassLabel')}:</span>
                      <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                    </div>
                    <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${strength.percent}%`,
                          background: strength.color,
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 确认密码输入 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                  {t('setLockPasswordModal.confirmPassLabel')} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('setLockPasswordModal.confirmPassPlaceholder')}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
              </div>

              {/* 密码提示词 (可选) */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>{t('setLockPasswordModal.hintLabel')}</span>
                  <HelpCircle style={{ width: 13, height: 13, color: '#7E92C4' }} />
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder={t('setLockPasswordModal.hintPlaceholder')}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
              </div>

              {/* 强提醒备份复选框 */}
              <div
                style={{
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: hasBackedUpSecretKey ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: hasBackedUpSecretKey ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  cursor: 'pointer',
                }}
                onClick={() => setHasBackedUpSecretKey(!hasBackedUpSecretKey)}
              >
                <input
                  type="checkbox"
                  checked={hasBackedUpSecretKey}
                  onChange={(e) => setHasBackedUpSecretKey(e.target.checked)}
                  style={{ marginTop: 3, cursor: 'pointer' }}
                />
                <label style={{ fontSize: 11.5, color: hasBackedUpSecretKey ? '#A7F3D0' : '#FDE68A', lineHeight: 1.4, cursor: 'pointer' }}>
                  {t('setLockPasswordModal.backupCheckbox')}
                </label>
              </div>

              {/* 错误提示 */}
              {errorMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FCA5A5',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="modal-window-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#8EA4D4' }}>
              <ShieldCheck style={{ width: 15, height: 15, color: '#34D399' }} />
              <span>PBKDF2-100k + 128-bit</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-action-cancel"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-action-submit"
                disabled={isSubmitting}
                style={{
                  background: 'linear-gradient(135deg, #0572EC 0%, #00D4FF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSubmitting ? (
                  <RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" />
                ) : (
                  <Lock style={{ width: 14, height: 14 }} />
                )}
                <span>{isSubmitting ? t('setLockPasswordModal.submittingBtn') : t('setLockPasswordModal.submitBtn')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetLockPasswordModal;
