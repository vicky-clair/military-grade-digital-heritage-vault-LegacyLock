import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { UsbPasswordConfig } from '../types';
import { verifyPassword } from '../services/cryptoService';

interface LockScreenProps {
  isOpen: boolean;
  config?: UsbPasswordConfig;
  onUnlock: () => void;
  onEmergencyWipe?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isOpen,
  config,
  onUnlock,
  onEmergencyWipe,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setShowHint(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasPinConfigured = Boolean(
    config?.hasMasterPassword && config?.masterPasswordHash && config?.masterPasswordSalt
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (hasPinConfigured) {
      if (!pin) {
        setErrorMsg('请输入主 U 盘访问密码 (Master PIN)');
        return;
      }

      setIsVerifying(true);
      try {
        const isValid = await verifyPassword(
          pin,
          config?.masterPasswordHash,
          config?.masterPasswordSalt
        );

        if (isValid) {
          onUnlock();
        } else {
          setErrorMsg('密码错误：PIN 码不匹配，介质已记录单次异常访问！');
        }
      } catch (err: any) {
        setErrorMsg(`验证失败: ${err.message || '未知错误'}`);
      } finally {
        setIsVerifying(false);
      }
    } else {
      // 未配置 PIN 码时直接恢复
      onUnlock();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 30%, #151d45 0%, #080c1d 100%)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#FFFFFF',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(18, 26, 68, 0.85)',
          border: '1.5px solid rgba(0, 212, 255, 0.4)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 212, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* 顶部中央发光锁盾图标 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #0572EC 0%, #7B2CBF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(5, 114, 236, 0.45)',
            marginBottom: 20,
            position: 'relative',
          }}
        >
          <Lock style={{ width: 34, height: 34, color: '#00D4FF' }} />
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid #080c1d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck style={{ width: 12, height: 12, color: '#FFFFFF' }} />
          </div>
        </div>

        {/* 标题与当前时间 */}
        <div style={{ fontSize: 13, color: '#00D4FF', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          MILITARY LOCK SYSTEM
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', marginBottom: 6 }}>
          数字遗产密钥库已安全锁定
        </h2>
        <div style={{ fontSize: 12, color: '#8EA4D4', marginBottom: 20 }}>
          {currentTime} · 检测到长时间闲置或防暂离锁定
        </div>

        {/* 状态徽章条 */}
        <div
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 10,
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 11.5,
            color: '#93C5FD',
            marginBottom: 24,
          }}
        >
          <Cpu style={{ width: 14, height: 14, color: '#00D4FF' }} />
          <span>内存敏感凭证已切断暴露 · AES-256-GCM 静止保护中</span>
        </div>

        {/* 解锁表单 */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {hasPinConfigured ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#C3D2F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>输入所有者主 U 盘密码 (PIN)</span>
                {config?.masterPasswordHint && (
                  <button
                    type="button"
                    onClick={() => setShowHint(!showHint)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00D4FF',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <HelpCircle style={{ width: 12, height: 12 }} />
                    <span>{showHint ? '隐藏提示' : '密码提示'}</span>
                  </button>
                )}
              </label>

              {showHint && config?.masterPasswordHint && (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.06)',
                    fontSize: 11,
                    color: '#FCD34D',
                    marginBottom: 4,
                  }}
                >
                  💡 提示：{config.masterPasswordHint}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="输入 6~32 位主 U 盘密码"
                  autoFocus
                  style={{
                    flex: 1,
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 10,
                    background: 'rgba(13, 18, 48, 0.95)',
                    border: errorMsg ? '1.5px solid #EF4444' : '1.5px solid rgba(0, 212, 255, 0.4)',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#8EA4D4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {showPin ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#8EA4D4', padding: '12px 0' }}>
              当前未配置介质物理 PIN 码，点击下方按钮立即恢复访问工作区。
            </div>
          )}

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
                textAlign: 'left',
              }}
            >
              <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            style={{
              width: '100%',
              height: 44,
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #0572EC 0%, #00D4FF 100%)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(0, 212, 255, 0.4)',
              marginTop: 6,
              transition: 'all 0.2s',
            }}
          >
            {isVerifying ? (
              <RefreshCw style={{ width: 16, height: 16 }} className="animate-spin" />
            ) : (
              <Unlock style={{ width: 16, height: 16 }} />
            )}
            <span>{isVerifying ? '正在验证安全凭据...' : hasPinConfigured ? '验证 PIN 并解锁密库' : '点击恢复访问'}</span>
          </button>
        </form>

        {/* 底部紧急擦除链接 */}
        {onEmergencyWipe && (
          <div style={{ marginTop: 24, fontSize: 11 }}>
            <button
              type="button"
              onClick={onEmergencyWipe}
              style={{
                background: 'none',
                border: 'none',
                color: '#EF4444',
                cursor: 'pointer',
                opacity: 0.8,
                textDecoration: 'underline',
              }}
            >
              紧急情况？执行军规数据即刻自毁
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
