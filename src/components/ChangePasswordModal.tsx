/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 锁屏主密码修改与重置弹窗 (ChangePasswordModal)
 * ============================================================================
 * 
 * 交互职责：
 * 1. 在系统设置 (SettingsView) 中供用户修改或重新设定锁屏主密码 (Master PIN)；
 * 2. 若原先已配置密码，强制先验证旧密码（基于加盐哈希 PBKDF2 验签）；
 * 3. 输入新密码并经军规强度校验（不少于 6 位，多因子强度计算）；
 * 4. 再次确认新密码，支持更新密码提示词；
 * 5. 完成后更新并持久化配置。
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { UsbPasswordConfig } from '../types';
import { hashPassword, verifyPassword } from '../services/cryptoService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: UsbPasswordConfig;
  onSuccess: (newHashHex: string, newSaltHex: string, newHint: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccess,
}) => {
  const hasExistingPassword = Boolean(
    config?.hasMasterPassword && config?.masterPasswordHash && config?.masterPasswordSalt
  );

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState(config?.masterPasswordHint || '');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHint(config?.masterPasswordHint || '');
      setErrorMsg('');
      setShowOldPass(false);
      setShowNewPass(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // 密码强度评估
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

  const strength = evaluateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 若已有旧密码，先校验旧密码
    if (hasExistingPassword) {
      if (!oldPassword) {
        setErrorMsg('请输入原锁屏密码以验证身份');
        return;
      }
      setIsSubmitting(true);
      try {
        const isOldValid = await verifyPassword(
          oldPassword,
          config?.masterPasswordHash,
          config?.masterPasswordSalt
        );
        if (!isOldValid) {
          setErrorMsg('原密码验证不正确，请重新输入');
          setIsSubmitting(false);
          return;
        }
      } catch (err: any) {
        setErrorMsg(`验证原密码失败: ${err.message || '未知错误'}`);
        setIsSubmitting(false);
        return;
      }
    }

    // 校验新密码
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('新密码长度不能少于 6 位字符');
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('两次输入的新密码不一致，请仔细核对');
      setIsSubmitting(false);
      return;
    }

    if (hasExistingPassword && oldPassword === newPassword) {
      setErrorMsg('新密码不能与原密码相同');
      setIsSubmitting(false);
      return;
    }

    try {
      const { hashHex, saltHex } = await hashPassword(newPassword);
      onSuccess(hashHex, saltHex, hint.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(`密码加密存储计算失败: ${err.message || '未知错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9998 }}>
      <div
        className="modal-window-dialog"
        style={{ width: 490, maxWidth: '92vw' }}
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
                background: 'linear-gradient(135deg, #0572EC 0%, #00D4FF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.35)',
                flexShrink: 0,
              }}
            >
              <KeyRound style={{ width: 18, height: 18, color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                {hasExistingPassword ? '修改锁屏主密码' : '设置锁屏主密码'}
              </div>
              <p style={{ fontSize: 11.5, color: '#8EA4D4', marginTop: 2 }}>
                {hasExistingPassword
                  ? '验证原密码后设置新的防暂离锁屏口令'
                  : '设定所有者日常防暂离锁屏认证密码'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-window-close" title="关闭">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit}>
          <div className="modal-window-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 原密码输入框 (仅在已有密码时显示) */}
              {hasExistingPassword && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                    原锁屏密码 <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="输入当前使用的锁屏密码"
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
                      onClick={() => setShowOldPass(!showOldPass)}
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
                      {showOldPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>
              )}

              {/* 新密码输入 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                  {hasExistingPassword ? '新锁屏密码' : '设置锁屏密码'} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入 6~32 位新密码"
                    autoFocus={!hasExistingPassword}
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
                    onClick={() => setShowNewPass(!showNewPass)}
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
                    {showNewPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>

                {/* 强度指示 */}
                {newPassword && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#8EA4D4' }}>新密码强度:</span>
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

              {/* 再次确认新密码 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'block', marginBottom: 6 }}>
                  再次确认新密码 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入相同的新密码"
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

              {/* 密码提示词 */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>密码提示词 (可选)</span>
                  <HelpCircle style={{ width: 13, height: 13, color: '#7E92C4' }} />
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="锁屏遗忘时显示的联想提示词"
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
              <span>PBKDF2 100,000 轮哈希与随机加盐</span>
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
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                )}
                <span>{isSubmitting ? '加密运算中...' : hasExistingPassword ? '确认修改密码' : '确认设置密码'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
