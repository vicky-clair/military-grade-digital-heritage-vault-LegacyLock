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
    if (!pwd) return { label: '请输入密码', color: '#7E92C4', percent: 0 };
    if (pwd.length < 6) return { label: '过短 (需不少于6位)', color: '#F43F5E', percent: 20 };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
    const score = (pwd.length >= 8 ? 1 : 0) + (hasNum ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 4) return { label: '极强 (军规推荐)', color: '#34D399', percent: 100 };
    if (score >= 3) return { label: '强 (安全性良好)', color: '#60A5FA', percent: 75 };
    return { label: '中等 (建议增加特殊符号)', color: '#FBBF24', percent: 45 };
  };

  const strength = evaluateStrength(password);

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRegenerateSecretKey = () => {
    if (window.confirm('重新生成紧急安全密钥将替换当前生成的密钥，确定要重新生成吗？')) {
      setSecretKey(generateSecretKey());
      setCopiedKey(false);
    }
  };

  // 下载 A4 紧急应急救援卡 (Emergency Kit)
  const handleDownloadEmergencyKit = () => {
    const kitText = generateEmergencyKitContent({
      secretKey,
      masterPasswordHint: hint.trim(),
      heirName: heirName || '法定继承人',
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
      setErrorMsg('主密码长度不能少于 6 位字符');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致，请仔细核对');
      return;
    }

    if (!hasBackedUpSecretKey) {
      setErrorMsg('请先勾选确认已妥善保存紧急安全密钥 (Secret Key) 方可继续');
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
      setErrorMsg(`密码学参数初始化失败: ${err.message || '未知错误'}`);
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
                <span>初始化主密码与安全密钥</span>
                <span className="badge-pill purple" style={{ fontSize: 10.5, padding: '2px 8px' }}>军规级规格</span>
              </div>
              <p className="modal-title-desc">
                初次配置将生成本地离线主密码 (Master PIN) 及高熵 128 位军规紧急安全密钥 (Secret Key)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-window-close" title="取消">
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
                    紧急安全密钥 (Secret Key)
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
                  title="重新生成新随机密钥"
                >
                  <RefreshCw style={{ width: 12, height: 12 }} />
                  <span>换一个</span>
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
                  <span>{copiedKey ? '已复制' : '复制'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <p style={{ fontSize: 11, color: '#D8B4FE', margin: 0, lineHeight: 1.4 }}>
                  🛡️ 128 位真随机生成。重装系统或从 U 盘恢复备份时，必须同时提供【主密码】+【安全密钥】。
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
                  <span>下载救援卡</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 主密码输入 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                  设置锁屏主密码 (Master Password) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入 6~32 位字母、数字或符号"
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
                      <span style={{ color: '#8EA4D4' }}>强度评定:</span>
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
                  再次确认主密码 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入相同的主密码"
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
                  <span>密码提示词 (可选，遗忘时展示)</span>
                  <HelpCircle style={{ width: 13, height: 13, color: '#7E92C4' }} />
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="例如：最喜欢的一本书+毕业年份（切勿直接写明密码）"
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
                  我已妥善保存该【紧急安全密钥】与【主密码】。我明确知晓若重装应用或导入备份，必须同时输入密码与此安全密钥方可解密恢复数据（防止单凭密码被盗取导致数据泄露）。
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
              <span>PBKDF2-SHA256 100,000 轮加盐 + 128位双因子防线</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-action-cancel"
                disabled={isSubmitting}
              >
                取消
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
                <span>{isSubmitting ? '计算加盐哈希中...' : '保存密码与密钥并立即锁屏'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetLockPasswordModal;
