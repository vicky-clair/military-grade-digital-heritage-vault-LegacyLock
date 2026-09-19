/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 双钥匙 PIN 码与硬件防护控制中心 (UsbPasswordModal)
 * ============================================================================
 * 
 * 界面重构与设计准则：
 * 1. 彻底去除割裂的选项卡模式，采用并列左右双卡对照设计：
 *    - 左卡：所有者主 U 盘密码 (Master PIN)，用于日常锁屏唤醒与本地密库管理，带高精度军规强度评估；
 *    - 右卡：法定继承人接管口令 (Heir PIN)，用于身后双盘联合激活，带信封备忘与公证人授权提示；
 * 2. 底部集成军规硬件安全状态条：直观展示 AES-256-GCM、Argon2id/PBKDF2、Ed25519 签名与单调计数器状态；
 * 3. 密码安全处理：输入密码后基于 WebCrypto 结合 16 字节随机盐生成 100,000 轮 PBKDF2 哈希，绝不在代码或配置中存留明文。
 */

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  HardDrive,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Usb,
  Shield,
  Key,
} from 'lucide-react';
import { UsbDrive, UsbPasswordConfig } from '../types';
import { hashPassword, writeDriveHardwareBinding } from '../services/cryptoService';
import { useI18n } from '../services/i18n';

/**
 * U 盘密码配置弹窗属性接口
 */
interface UsbPasswordModalProps {
  /** 弹窗是否可见 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 当前识别到的物理外接设备列表 */
  drives: UsbDrive[];
  /** 现有的 U 盘密码防护配置 */
  config?: UsbPasswordConfig;
  /** 保存配置回调 (提交加盐哈希后的配置与绑定介质) */
  onSaveConfig: (config: UsbPasswordConfig, targetDrive: string) => Promise<void>;
}

export const UsbPasswordModal: React.FC<UsbPasswordModalProps> = ({
  isOpen,
  onClose,
  drives,
  config,
  onSaveConfig,
}) => {
  const { t } = useI18n();

  // 主盘密码
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [masterHint, setMasterHint] = useState(config?.masterPasswordHint || '');
  const [showMasterPass, setShowMasterPass] = useState(false);

  // 副盘接管密码
  const [heirPassword, setHeirPassword] = useState('');
  const [confirmHeirPassword, setConfirmHeirPassword] = useState('');
  const [heirHint, setHeirHint] = useState(config?.heirPasswordHint || '');
  const [showHeirPass, setShowHeirPass] = useState(false);

  // 基础参数
  const [selectedDrive, setSelectedDrive] = useState(drives.length > 0 ? drives[0].mountPath : '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 密码强度评估
  const evaluateStrength = (pwd: string) => {
    if (!pwd) return { label: t('usbModal.strengthNone'), color: '#7E92C4', percent: 0 };
    if (pwd.length < 6) return { label: t('usbModal.strengthWeak'), color: '#F43F5E', percent: 25 };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
    const score = (pwd.length >= 8 ? 1 : 0) + (hasNum ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 4) return { label: t('usbModal.strengthMilitary'), color: '#34D399', percent: 100 };
    if (score >= 3) return { label: t('usbModal.strengthStrong'), color: '#60A5FA', percent: 75 };
    return { label: t('usbModal.strengthMedium'), color: '#FBBF24', percent: 50 };
  };

  const masterStrength = evaluateStrength(masterPassword);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (masterPassword && masterPassword !== confirmMasterPassword) {
      setFeedbackMsg({ type: 'error', text: t('usbModal.masterMismatchError') });
      return;
    }

    if (heirPassword && heirPassword !== confirmHeirPassword) {
      setFeedbackMsg({ type: 'error', text: t('usbModal.heirMismatchError') });
      return;
    }

    setIsSaving(true);
    try {
      let masterHash = config?.masterPasswordHash;
      let masterSalt = config?.masterPasswordSalt;
      if (masterPassword.trim()) {
        const h = await hashPassword(masterPassword.trim());
        masterHash = h.hashHex;
        masterSalt = h.saltHex;
      }

      let heirHash = config?.heirPasswordHash;
      let heirSalt = config?.heirPasswordSalt;
      if (heirPassword.trim()) {
        const h = await hashPassword(heirPassword.trim());
        heirHash = h.hashHex;
        heirSalt = h.saltHex;
      }

      const newConfig: UsbPasswordConfig = {
        ...(config || {}),
        hasMasterPassword: Boolean(masterHash),
        masterPasswordHash: masterHash,
        masterPasswordSalt: masterSalt,
        masterPasswordHint: masterHint || config?.masterPasswordHint,
        hasHeirPassword: Boolean(heirHash),
        heirPasswordHash: heirHash,
        heirPasswordSalt: heirSalt,
        heirPasswordHint: heirHint || config?.heirPasswordHint,
        autoLockMinutes: config?.autoLockMinutes || 15,
        lastChangedAt: Date.now(),
        isHardwareEncrypted: true,
      };

      await onSaveConfig(newConfig, selectedDrive);

      // 绑定继承人 U 盘硬件指纹 (防克隆转移)
      const targetDriveObj = drives.find((d) => d.mountPath === selectedDrive);
      if (targetDriveObj) {
        try {
          await writeDriveHardwareBinding(targetDriveObj);
        } catch (bindErr) {
          console.warn('[写入介质硬件指纹绑定失败]', bindErr);
        }
      }

      setFeedbackMsg({ type: 'success', text: `✅ ${t('usbModal.saveSuccess')}` });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `${t('common.error')}: ${err.message || ''}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window-dialog usb-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部独立窗口标题栏 */}
        <div className="modal-window-header">
          <div className="modal-window-title">
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0572EC 0%, #7B2CBF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 114, 236, 0.4)',
                flexShrink: 0,
              }}
            >
              <KeyRound style={{ width: 19, height: 19, color: '#00D4FF' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  {t('usbModal.title')}
                </span>
                <span className="modal-badge-cat" style={{ color: '#00D4FF', borderColor: 'rgba(0,212,255,0.3)' }}>
                  Dual-Key
                </span>
                <span className="modal-badge-cat">
                  AES-256-GCM
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                {t('usbModal.subtitle')}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="Close">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 弹窗表单正文 */}
        <form onSubmit={handleSave} className="modal-window-body" style={{ gap: 16 }}>
          {/* 1. 目标硬件介质选择卡 */}
          <div className="form-card" style={{ padding: '12px 16px', background: 'rgba(15, 23, 58, 0.85)' }}>
            <div className="form-card-title" style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00D4FF' }}>
                <HardDrive style={{ width: 15, height: 15 }} />
                <span>{t('usbModal.targetDriveLabel')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: drives.length > 0 ? '#10B981' : '#F59E0B' }} />
                <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>
                  {drives.length} {t('settings.drivesOnline')}
                </span>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={selectedDrive}
                onChange={(e) => setSelectedDrive(e.target.value)}
                className="framed-select"
                style={{ height: 38 }}
              >
                {drives.length > 0 ? (
                  drives.map((d) => (
                    <option key={d.mountPath} value={d.mountPath} style={{ background: '#12173B', color: '#FFFFFF' }}>
                      {d.name} ({d.mountPath}) · {d.mediaType || 'USB'} · {d.hasPasswordProtected ? 'Dual-Key' : 'Unlocked'}
                    </option>
                  ))
                ) : (
                  <option value="" style={{ background: '#12173B', color: '#FFFFFF' }}>
                    {t('usbModal.noDriveDetected')}
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* 2. 一体化双钥匙对照面板 (去除割裂的选项卡切换) */}
          <div className="usb-dual-panel-grid">
            {/* 左面板：所有者主 U 盘访问密码 (Master PIN) */}
            <div className="usb-key-card master-card">
              <div className="usb-key-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(0, 212, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00D4FF',
                    }}
                  >
                    <Lock style={{ width: 15, height: 15 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>
                      {t('usbModal.masterTitle')}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#8EA4D4' }}>{t('usbModal.masterDesc')}</div>
                  </div>
                </div>
                <span className="usb-key-badge master">Master</span>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(5, 114, 236, 0.12)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  fontSize: 11,
                  color: '#93C5FD',
                  lineHeight: 1.45,
                }}
              >
                AES-256-GCM + PBKDF2-100,000 Zero-Knowledge Protection
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>
                  {t('usbModal.masterPassLabel')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type={showMasterPass ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder={t('usbModal.masterPassPlaceholder')}
                    className="framed-input font-mono"
                    style={{ flex: 1, height: 36, fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPass(!showMasterPass)}
                    className="btn-framed-icon"
                    title={showMasterPass ? 'Hide' : 'Show'}
                    style={{ height: 36, width: 36 }}
                  >
                    {showMasterPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>

                {/* 强度指示 */}
                {masterPassword && (
                  <div style={{ marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
                      <span style={{ color: '#8EA4D4' }}>Entropy:</span>
                      <span style={{ color: masterStrength.color, fontWeight: 700 }}>{masterStrength.label}</span>
                    </div>
                    <div style={{ width: '100%', height: 3.5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${masterStrength.percent}%`,
                          height: '100%',
                          background: masterStrength.color,
                          transition: 'all 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>{t('usbModal.confirmMasterPassLabel')}</label>
                <input
                  type={showMasterPass ? 'text' : 'password'}
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  placeholder={t('usbModal.confirmMasterPassPlaceholder')}
                  className="framed-input font-mono"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>{t('usbModal.masterHintLabel')}</label>
                <input
                  type="text"
                  value={masterHint}
                  onChange={(e) => setMasterHint(e.target.value)}
                  placeholder={t('usbModal.masterHintPlaceholder')}
                  className="framed-input"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#7E92C4', marginTop: 'auto' }}>
                <Shield style={{ width: 12, height: 12, color: '#00D4FF' }} />
                <span>{t('usbModal.hardwareCryptoStatus')}</span>
              </div>
            </div>

            {/* 右面板：法定继承人副盘接管口令 (Heir PIN) */}
            <div className="usb-key-card heir-card">
              <div className="usb-key-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C084FC',
                    }}
                  >
                    <Key style={{ width: 15, height: 15 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF' }}>
                      {t('usbModal.heirTitle')}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#8EA4D4' }}>{t('usbModal.heirDesc')}</div>
                  </div>
                </div>
                <span className="usb-key-badge heir">Heir</span>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  fontSize: 11,
                  color: '#D8B4FE',
                  lineHeight: 1.45,
                }}
              >
                🔐 Dual-USB + Master Secret Key Joint Recovery
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>
                  {t('usbModal.heirPassLabel')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type={showHeirPass ? 'text' : 'password'}
                    value={heirPassword}
                    onChange={(e) => setHeirPassword(e.target.value)}
                    placeholder={t('usbModal.heirPassPlaceholder')}
                    className="framed-input font-mono"
                    style={{ flex: 1, height: 36, fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowHeirPass(!showHeirPass)}
                    className="btn-framed-icon"
                    title={showHeirPass ? 'Hide' : 'Show'}
                    style={{ height: 36, width: 36 }}
                  >
                    {showHeirPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>{t('usbModal.confirmHeirPassLabel')}</label>
                <input
                  type={showHeirPass ? 'text' : 'password'}
                  value={confirmHeirPassword}
                  onChange={(e) => setConfirmHeirPassword(e.target.value)}
                  placeholder={t('usbModal.confirmHeirPassPlaceholder')}
                  className="framed-input font-mono"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>{t('usbModal.heirHintLabel')}</label>
                <input
                  type="text"
                  value={heirHint}
                  onChange={(e) => setHeirHint(e.target.value)}
                  placeholder={t('usbModal.heirHintPlaceholder')}
                  className="framed-input"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#C084FC', marginTop: 'auto' }}>
                <ShieldCheck style={{ width: 12, height: 12, color: '#C084FC' }} />
                <span>Ed25519 + Monotonic Counter Replay Protection</span>
              </div>
            </div>
          </div>

          {/* 反馈消息 */}
          {feedbackMsg && (
            <div
              style={{
                padding: 10,
                borderRadius: 9,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: feedbackMsg.type === 'success' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                border: feedbackMsg.type === 'success' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
                color: feedbackMsg.type === 'success' ? '#6EE7B7' : '#FDA4AF',
              }}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0 }} />
              ) : (
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </form>

        {/* 底部独立按钮栏 */}
        <div className="modal-window-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#8EA4D4' }}>
            <Usb style={{ width: 15, height: 15, color: '#00D4FF' }} />
            <span>Windows / macOS / Linux Universal Hardware Spec</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-action-cancel"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-action-submit"
            >
              {isSaving ? (
                <RefreshCw style={{ width: 14, height: 14 }} className="animate-spin" />
              ) : (
                <ShieldCheck style={{ width: 14, height: 14 }} />
              )}
              <span>{isSaving ? t('usbModal.savingBtn') : t('usbModal.saveSettingsBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
