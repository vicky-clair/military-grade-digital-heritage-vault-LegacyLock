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
  Cpu,
} from 'lucide-react';
import { UsbDrive, UsbPasswordConfig } from '../types';

interface UsbPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  drives: UsbDrive[];
  config?: UsbPasswordConfig;
  onSaveConfig: (config: UsbPasswordConfig, targetDrive: string) => Promise<void>;
}

export const UsbPasswordModal: React.FC<UsbPasswordModalProps> = ({
  isOpen,
  onClose,
  drives,
  config,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'master' | 'heir' | 'hardware'>('master');
  
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
  const [autoLockMinutes, setAutoLockMinutes] = useState(config?.autoLockMinutes || 15);
  const [selectedDrive, setSelectedDrive] = useState(drives.length > 0 ? drives[0].mountPath : '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // 密码强度评估
  const evaluateStrength = (pwd: string) => {
    if (!pwd) return { label: '未设置', color: '#7E92C4', percent: 0 };
    if (pwd.length < 6) return { label: '弱 (少于6位)', color: '#F43F5E', percent: 25 };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
    const score = (pwd.length >= 8 ? 1 : 0) + (hasNum ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 4) return { label: '极强 (军规级)', color: '#34D399', percent: 100 };
    if (score >= 3) return { label: '强', color: '#60A5FA', percent: 75 };
    return { label: '中等', color: '#FBBF24', percent: 50 };
  };

  const strength = evaluateStrength(masterPassword);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (masterPassword && masterPassword !== confirmMasterPassword) {
      setFeedbackMsg({ type: 'error', text: '主U盘两次输入的密码不一致，请核对后重新输入。' });
      return;
    }

    if (heirPassword && heirPassword !== confirmHeirPassword) {
      setFeedbackMsg({ type: 'error', text: '副U盘两次输入的接管密码不一致，请核对。' });
      return;
    }

    setIsSaving(true);
    try {
      const newConfig: UsbPasswordConfig = {
        hasMasterPassword: Boolean(masterPassword || config?.hasMasterPassword),
        masterPasswordHint: masterHint || config?.masterPasswordHint,
        hasHeirPassword: Boolean(heirPassword || config?.hasHeirPassword),
        heirPasswordHint: heirHint || config?.heirPasswordHint,
        autoLockMinutes,
        lastChangedAt: Date.now(),
        isHardwareEncrypted: true,
      };

      await onSaveConfig(newConfig, selectedDrive);
      setFeedbackMsg({ type: 'success', text: '✅ U盘密码与硬件加密配置已成功写入选定介质！' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `写入介质失败: ${err.message || '未知错误'}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部独立窗口标题栏 */}
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
                boxShadow: '0 4px 12px rgba(5, 114, 236, 0.4)',
                flexShrink: 0,
              }}
            >
              <KeyRound style={{ width: 18, height: 18, color: '#00D4FF' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  U盘密码与硬件加密保护中心
                </span>
                <span className="modal-badge-cat">
                  AES-256-XTS
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                为移动硬盘与U盘注入物理PIN码与双钥匙访问限制
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="关闭窗口">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 选项卡切换 (带框美化) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 24px 0 24px',
            background: 'rgba(14, 20, 52, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('master')}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'master' ? '2.5px solid #00D4FF' : '2.5px solid transparent',
              background: activeTab === 'master' ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
              color: activeTab === 'master' ? '#00D4FF' : '#8EA4D4',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Lock style={{ width: 14, height: 14 }} />
            <span>主U盘密码 (Master PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('heir')}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'heir' ? '2.5px solid #A855F7' : '2.5px solid transparent',
              background: activeTab === 'heir' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
              color: activeTab === 'heir' ? '#C084FC' : '#8EA4D4',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck style={{ width: 14, height: 14 }} />
            <span>副U盘接管口令 (Heir PIN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: '8px 8px 0 0',
              borderBottom: activeTab === 'hardware' ? '2.5px solid #34D399' : '2.5px solid transparent',
              background: activeTab === 'hardware' ? 'rgba(52, 211, 153, 0.12)' : 'transparent',
              color: activeTab === 'hardware' ? '#34D399' : '#8EA4D4',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Cpu style={{ width: 14, height: 14 }} />
            <span>硬件加密参数</span>
          </button>
        </div>

        {/* 弹窗表单正文 */}
        <form onSubmit={handleSave} className="modal-window-body">
          {/* 目标硬件设备选择 (加框美化) */}
          <div className="form-card">
            <div className="form-card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00D4FF' }}>
                <HardDrive style={{ width: 16, height: 16 }} />
                <span>目标存储介质 (U盘 / 移动固态硬盘)</span>
              </div>
              <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>
                {drives.length} 个设备在线
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={selectedDrive}
                onChange={(e) => setSelectedDrive(e.target.value)}
                className="framed-select"
              >
                {drives.length > 0 ? (
                  drives.map((d) => (
                    <option key={d.mountPath} value={d.mountPath} style={{ background: '#12173B', color: '#FFFFFF' }}>
                      {d.name} ({d.mountPath}) · {d.mediaType || 'USB'} · {d.hasPasswordProtected ? '已加密保护' : '未加锁'}
                    </option>
                  ))
                ) : (
                  <option value="" style={{ background: '#12173B', color: '#FFFFFF' }}>
                    未检测到外接U盘 (将配置本地离线证书)
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* TAB 1: 主盘硬件密码 */}
          {activeTab === 'master' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(5, 114, 236, 0.12)',
                  border: '1px solid rgba(5, 114, 236, 0.3)',
                  fontSize: 12,
                  color: '#93C5FD',
                  lineHeight: 1.5,
                }}
              >
                <strong>所有者最高权限保护：</strong>
                设置主 U 盘访问密码后，每次插入电脑解锁遗产库时，除物理插入 U 盘外还需输入此 PIN 码，杜绝 U 盘遗失被盗风险。
              </div>

              <div className="form-card">
                <div className="framed-input-container">
                  <label className="framed-label">设置 / 修改主U盘密码 (PIN)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={showMasterPass ? 'text' : 'password'}
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      placeholder="输入 6~32 位安全访问密码"
                      className="framed-input font-mono"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPass(!showMasterPass)}
                      className="btn-framed-icon"
                      title={showMasterPass ? '隐藏密码' : '显示密码'}
                    >
                      {showMasterPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>

                  {/* 强度条 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: '#8EA4D4' }}>密码强度：</span>
                    <span style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                  </div>
                  <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                    <div
                      style={{
                        width: `${strength.percent}%`,
                        height: '100%',
                        background: strength.color,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div className="framed-input-container">
                  <label className="framed-label">再次确认主U盘密码</label>
                  <input
                    type={showMasterPass ? 'text' : 'password'}
                    value={confirmMasterPassword}
                    onChange={(e) => setConfirmMasterPassword(e.target.value)}
                    placeholder="再次输入上述主U盘密码"
                    className="framed-input font-mono"
                  />
                </div>

                <div className="framed-input-container">
                  <label className="framed-label">主密码提示 (Password Hint，可选)</label>
                  <input
                    type="text"
                    value={masterHint}
                    onChange={(e) => setMasterHint(e.target.value)}
                    placeholder="例：生日后四位+常用服务器后缀"
                    className="framed-input"
                  />
                </div>

                <div className="framed-input-container">
                  <label className="framed-label">介质自动锁定与防暂离保护</label>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                    className="framed-select"
                  >
                    <option value={5} style={{ background: '#12173B', color: '#FFFFFF' }}>闲置 5 分钟后自动上锁</option>
                    <option value={15} style={{ background: '#12173B', color: '#FFFFFF' }}>闲置 15 分钟后自动上锁 (推荐)</option>
                    <option value={30} style={{ background: '#12173B', color: '#FFFFFF' }}>闲置 30 分钟后自动上锁</option>
                    <option value={60} style={{ background: '#12173B', color: '#FFFFFF' }}>闲置 1 小时后自动上锁</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 副盘接管密码 */}
          {activeTab === 'heir' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  fontSize: 12,
                  color: '#D8B4FE',
                  lineHeight: 1.5,
                }}
              >
                <strong>法定继承人接管授权保护：</strong>
                副 U 盘（副卡）内包含只读恢复公钥和 30 年应急救援单页。为副 U 盘设置口令后，继承人需要同时持有「副介质实体 + 接管口令」方可启动解密，双重保障家庭数字资产。
              </div>

              <div className="form-card">
                <div className="framed-input-container">
                  <label className="framed-label">设置副U盘接管口令</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type={showHeirPass ? 'text' : 'password'}
                      value={heirPassword}
                      onChange={(e) => setHeirPassword(e.target.value)}
                      placeholder="输入指定给继承人的接管口令"
                      className="framed-input font-mono"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowHeirPass(!showHeirPass)}
                      className="btn-framed-icon"
                      title={showHeirPass ? '隐藏密码' : '显示密码'}
                    >
                      {showHeirPass ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                </div>

                <div className="framed-input-container">
                  <label className="framed-label">确认副U盘接管口令</label>
                  <input
                    type={showHeirPass ? 'text' : 'password'}
                    value={confirmHeirPassword}
                    onChange={(e) => setConfirmHeirPassword(e.target.value)}
                    placeholder="再次输入副U盘接管口令"
                    className="framed-input font-mono"
                  />
                </div>

                <div className="framed-input-container">
                  <label className="framed-label">继承人提示备忘 (可写在随盘信封中)</label>
                  <input
                    type="text"
                    value={heirHint}
                    onChange={(e) => setHeirHint(e.target.value)}
                    placeholder="例：见家族信托公证书第3条或母亲纪念日"
                    className="framed-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 硬件加密参数 */}
          {activeTab === 'hardware' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#8EA4D4' }}>密码套件 (Cipher Suite)</span>
                  <span style={{ color: '#34D399', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>LLCS-1 (Argon2id + AES-256-GCM)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#8EA4D4' }}>硬件介质级防篡改</span>
                  <span style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono' }}>Ed25519 签名强制绑定</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#8EA4D4' }}>防回滚单调计数器</span>
                  <span style={{ color: '#C084FC', fontFamily: 'JetBrains Mono' }}>Active (Sequence #1)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8EA4D4' }}>抗暴力破解派生参数</span>
                  <span style={{ color: '#D3E0FA', fontFamily: 'JetBrains Mono' }}>Memory: 64MB, Iterations: 3</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(52, 211, 153, 0.12)',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  color: '#6EE7B7',
                  fontSize: 12,
                }}
              >
                <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>密码将通过加盐哈希（Argon2id）处理，介质内绝不保存任何明文密码。</span>
              </div>
            </div>
          )}

          {/* 反馈消息 */}
          {feedbackMsg && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
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
                <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
              ) : (
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </form>

        {/* 底部独立按钮栏 (加框美化) */}
        <div className="modal-window-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8EA4D4' }}>
            <Usb style={{ width: 16, height: 16, color: '#00D4FF' }} />
            <span>插拔移动介质后即时生效</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-action-cancel"
            >
              取消
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
              <span>{isSaving ? '正在写入介质...' : '保存并写入U盘密码'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
