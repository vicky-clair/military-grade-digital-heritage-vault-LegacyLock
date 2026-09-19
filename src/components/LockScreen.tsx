/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 全屏高斯模糊防暂离锁屏组件 (LockScreen)
 * ============================================================================
 * 
 * 安全机制：
 * 1. 物理窥视防护：用户离席或空闲超时后，全屏覆盖高斯模糊毛玻璃遮罩，彻底遮蔽资产卡片与明文凭据；
 * 2. 身份认证验签：必须输入所有者主密码 (Master PIN)，经 PBKDF2 100,000 轮加盐哈希校验成功方可解除锁定；
 * 3. 身边人威胁隔离：继承人口令 (Heir PIN) 无法解开所有者日常锁屏，保证生前隐私绝对不被提前窥探；
 * 4. 极端胁迫自毁：提供防入室胁迫的紧急擦除快速通道 (Emergency Wipe)。
 */

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
  Usb,
  BookOpen,
  ShieldAlert,
  AlertOctagon,
  Key,
} from 'lucide-react';
import { UsbDrive, UsbPasswordConfig } from '../types';
import {
  verifyPassword,
  verifyDriveHardwareBinding,
  computeSecretKeyHash,
  cleanSecretKey,
} from '../services/cryptoService';

/**
 * 锁屏组件属性接口
 */
interface LockScreenProps {
  /** 锁屏遮罩激活状态 */
  isOpen: boolean;
  /** 介质密码配置模型 */
  config?: UsbPasswordConfig;
  /** PIN 码验证通过解除锁定的回调 */
  onUnlock: () => void;
  /** 触发紧急全盘数据销毁回调 */
  onEmergencyWipe?: () => void;
  /** 当前检测到的 USB 驱动器列表 (用于双 U 盘继承人免密解锁) */
  drives?: UsbDrive[];
  /** 双 U 盘继承人免密只读解锁回调 */
  onHeirReadOnlyUnlock?: () => void;
  /** 重新扫描驱动器回调 */
  onRescanDrives?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isOpen,
  config,
  onUnlock,
  onEmergencyWipe,
  drives,
  onHeirReadOnlyUnlock,
  onRescanDrives,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [useSecretKeyUnlock, setUseSecretKeyUnlock] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [isVerifying, setIsVerifying] = useState(false);

  // 紧急销毁二次确认状态 (需确认两次)
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipeError, setWipeError] = useState('');

  // 锁屏期间自动定期 2.5 秒探测 U 盘插拔状态
  useEffect(() => {
    if (!isOpen) return;
    onRescanDrives?.();
    const interval = setInterval(() => {
      onRescanDrives?.();
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, onRescanDrives]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setSecretKeyInput('');
      setUseSecretKeyUnlock(false);
      setErrorMsg('');
      setShowHint(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasPinConfigured = Boolean(
    config?.hasMasterPassword && config?.masterPasswordHash && config?.masterPasswordSalt
  );

  // 检测双 U 盘是否同时在线 (主盘 hasUserKey + 副盘 hasHeirKey)
  const masterUsbDrive = drives?.find((d) => d.hasUserKey);
  const heirUsbDrive = drives?.find((d) => d.hasHeirKey);
  const isDualUsbReady = Boolean(masterUsbDrive && heirUsbDrive && onHeirReadOnlyUnlock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 模式一：通过 128 位紧急安全密钥应急解锁
    if (useSecretKeyUnlock) {
      const cleanKey = cleanSecretKey(secretKeyInput);
      if (!cleanKey) {
        setErrorMsg('请输入完整的 128 位紧急安全密钥 (Secret Key)');
        return;
      }

      setIsVerifying(true);
      try {
        let isValid = false;
        if (config?.secretKeyHash) {
          const inputHash = await computeSecretKeyHash(cleanKey);
          isValid = inputHash === config.secretKeyHash;
        } else if (config?.secretKey) {
          isValid = cleanKey === cleanSecretKey(config.secretKey);
        }

        if (isValid) {
          onUnlock();
        } else {
          setErrorMsg('安全密钥校验未通过：与当前密库绑定的 128 位紧急安全密钥不匹配！');
        }
      } catch (err: any) {
        setErrorMsg(`验证失败: ${err.message || '未知错误'}`);
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    // 模式二：日常 Master PIN 码验证解锁
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
          {useSecretKeyUnlock ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key style={{ width: 14, height: 14 }} />
                <span>输入 128 位紧急安全密钥 (Secret Key)</span>
              </label>
              <div style={{ fontSize: 11, color: '#8EA4D4', marginBottom: 2 }}>
                请查阅纸质应急单 (Emergency Kit) 或安全信封中的 128 位密钥应急解锁
              </div>
              <input
                type="text"
                value={secretKeyInput}
                onChange={(e) => setSecretKeyInput(e.target.value.toUpperCase())}
                placeholder="例如：LL-XXXX-XXXX-XXXX-XXXX..."
                autoFocus
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 14px',
                  borderRadius: 10,
                  background: 'rgba(13, 18, 48, 0.95)',
                  border: errorMsg ? '1.5px solid #EF4444' : '1.5px solid rgba(245, 158, 11, 0.5)',
                  color: '#FDE68A',
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setUseSecretKeyUnlock(false);
                  setErrorMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#93C5FD',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: 4,
                  padding: 0,
                }}
              >
                ← 返回使用主 U 盘密码 (PIN) 解锁
              </button>
            </div>
          ) : hasPinConfigured ? (
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

              {config?.hasSecretKey && (
                <button
                  type="button"
                  onClick={() => {
                    setUseSecretKeyUnlock(true);
                    setErrorMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00D4FF',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginTop: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                  }}
                >
                  <Key style={{ width: 12, height: 12 }} />
                  <span>忘记密码？使用 128 位紧急安全密钥解锁</span>
                </button>
              )}
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
              background: useSecretKeyUnlock
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                : 'linear-gradient(135deg, #0572EC 0%, #00D4FF 100%)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: isVerifying ? 'not-allowed' : 'pointer',
              boxShadow: useSecretKeyUnlock
                ? '0 4px 16px rgba(245, 158, 11, 0.4)'
                : '0 4px 16px rgba(0, 212, 255, 0.4)',
              marginTop: 6,
              transition: 'all 0.2s',
            }}
          >
            {isVerifying ? (
              <RefreshCw style={{ width: 16, height: 16 }} className="animate-spin" />
            ) : useSecretKeyUnlock ? (
              <Key style={{ width: 16, height: 16 }} />
            ) : (
              <Unlock style={{ width: 16, height: 16 }} />
            )}
            <span>
              {isVerifying
                ? '正在验证安全凭据...'
                : useSecretKeyUnlock
                ? '验证安全密钥并应急解锁'
                : hasPinConfigured
                ? '验证 PIN 并解锁密库'
                : '点击恢复访问'}
            </span>
          </button>
        </form>

        {/* 🟢 双 U 盘继承人免密只读接管卡片 */}
        <div style={{ width: '100%', marginTop: 20 }}>
          {isDualUsbReady ? (
            <div
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 95, 70, 0.18) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                animation: 'fadeIn 0.6s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Usb style={{ width: 15, height: 15, color: '#34D399' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#34D399' }}>🟢 检测到主副双 U 盘已就绪</div>
                    <div style={{ fontSize: 11, color: '#A7F3D0', marginTop: 1 }}>
                      主盘 ({masterUsbDrive?.driveLetter || masterUsbDrive?.name}) + 继承人盘 ({heirUsbDrive?.driveLetter || heirUsbDrive?.name})
                    </div>
                  </div>
                </div>
                {onRescanDrives && (
                  <button
                    type="button"
                    onClick={onRescanDrives}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#34D399',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title="重新检测 U 盘"
                  >
                    <RefreshCw style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  setErrorMsg('');
                  if (heirUsbDrive) {
                    const bindRes = await verifyDriveHardwareBinding(heirUsbDrive);
                    if (!bindRes.matched) {
                      setErrorMsg(
                        bindRes.error ||
                        '❌ 继承人 U 盘硬件防克隆绑定校验未通过！检测到密钥文件被强制转移到未授权介质，拒绝解锁！'
                      );
                      return;
                    }
                  }
                  onHeirReadOnlyUnlock?.();
                }}
                style={{
                  width: '100%',
                  height: 40,
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <BookOpen style={{ width: 15, height: 15 }} />
                <span>通过双 U 盘解锁应用 (继承人只读查看)</span>
              </button>
              <div style={{ fontSize: 10.5, color: '#A7F3D0', opacity: 0.85, textAlign: 'center', lineHeight: 1.4 }}>
                仅可进行数据查看与复制，不可进行修改；输入主密码与安全密钥方可修改
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Usb style={{ width: 13, height: 13, color: '#7E92C4' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#94A3B8' }}>
                    双 U 盘继承人免密解锁通道 (只读模式)
                  </span>
                </div>
                {onRescanDrives && (
                  <button
                    type="button"
                    onClick={onRescanDrives}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00D4FF',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw style={{ width: 11, height: 11 }} />
                    <span>检测 U 盘</span>
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                继承人可插入【所有者主 U 盘】与【继承人专属 U 盘】双介质免密解锁查阅
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 10.5 }}>
                <span style={{ color: masterUsbDrive ? '#34D399' : '#64748B' }}>
                  {masterUsbDrive ? '✅ 主盘已接入' : '⚪ 主盘未检测'}
                </span>
                <span style={{ color: heirUsbDrive ? '#34D399' : '#64748B' }}>
                  {heirUsbDrive ? '✅ 继承人盘已接入' : '⚪ 继承人盘未检测'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 底部紧急擦除链接 (需确认两次) */}
        {onEmergencyWipe && (
          <div style={{ marginTop: 24, fontSize: 11 }}>
            <button
              type="button"
              onClick={() => {
                setWipeStep(1);
                setWipeConfirmText('');
                setWipeError('');
              }}
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

      {/* 军规数据即刻自毁 —— 双重确认防护模态弹窗 (需确认两次) */}
      {wipeStep > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#0F172A',
              border: '1.5px solid rgba(239, 68, 68, 0.6)',
              borderRadius: 20,
              padding: '28px 24px',
              boxShadow: '0 25px 60px rgba(239, 68, 68, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'left',
            }}
          >
            {/* 步骤 1：第一重警告确认 */}
            {wipeStep === 1 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldAlert style={{ width: 20, height: 20, color: '#EF4444' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#EF4444', margin: 0 }}>
                      【第一重确认】严重警告：数据自毁
                    </h3>
                    <div style={{ fontSize: 11, color: '#FDA4AF', marginTop: 2 }}>
                      数据极其重要，此操作属于终极不可逆销毁
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: 12,
                    color: '#FCA5A5',
                    lineHeight: 1.6,
                  }}
                >
                  ⚠️ <strong>请注意：</strong>一旦确认自毁，本设备上的所有密码条目、私钥、身份证书及遗产配置将被<strong>立即彻底粉碎擦除</strong>，没有任何找回途径！您确定要继续进入最终确认步骤吗？
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setWipeStep(0)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#E2E8F0',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    放弃取消 (推荐)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWipeStep(2);
                      setWipeConfirmText('');
                    }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    我已知晓，进入第二次确认
                  </button>
                </div>
              </>
            )}

            {/* 步骤 2：第二重最终输入授权确认 */}
            {wipeStep === 2 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertOctagon style={{ width: 20, height: 20, color: '#F87171' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F87171', margin: 0 }}>
                      【第二重确认】终极授权执行
                    </h3>
                    <div style={{ fontSize: 11, color: '#FDA4AF', marginTop: 2 }}>
                      输入验证词 DESTROY 后方可执行销毁
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.5 }}>
                  为彻底防止误触，请在下方文本框中手动输入大写确认词 <strong style={{ color: '#EF4444', fontFamily: 'monospace' }}>DESTROY</strong> 以授权立即销毁：
                </div>

                <input
                  type="text"
                  value={wipeConfirmText}
                  onChange={(e) => {
                    setWipeConfirmText(e.target.value);
                    setWipeError('');
                  }}
                  placeholder="请输入 DESTROY"
                  autoFocus
                  style={{
                    height: 42,
                    padding: '0 14px',
                    borderRadius: 8,
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(239, 68, 68, 0.5)',
                    color: '#FFFFFF',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    outline: 'none',
                  }}
                />

                {wipeError && (
                  <div style={{ fontSize: 11, color: '#F87171' }}>{wipeError}</div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setWipeStep(0)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#E2E8F0',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    紧急中止返回
                  </button>
                  <button
                    type="button"
                    disabled={wipeConfirmText.trim().toUpperCase() !== 'DESTROY'}
                    onClick={() => {
                      if (wipeConfirmText.trim().toUpperCase() === 'DESTROY') {
                        setWipeStep(0);
                        onEmergencyWipe?.();
                      } else {
                        setWipeError('确认词不匹配，请输入 DESTROY');
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: 'none',
                      background: wipeConfirmText.trim().toUpperCase() === 'DESTROY'
                        ? 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)'
                        : 'rgba(239, 68, 68, 0.2)',
                      color: wipeConfirmText.trim().toUpperCase() === 'DESTROY' ? '#FFFFFF' : '#94A3B8',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: wipeConfirmText.trim().toUpperCase() === 'DESTROY' ? 'pointer' : 'not-allowed',
                      boxShadow: wipeConfirmText.trim().toUpperCase() === 'DESTROY'
                        ? '0 4px 16px rgba(220, 38, 38, 0.5)'
                        : 'none',
                    }}
                  >
                    确认彻底自毁数据
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
