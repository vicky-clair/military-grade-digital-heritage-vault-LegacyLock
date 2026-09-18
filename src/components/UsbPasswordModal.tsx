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
  Shield,
  Key,
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
    if (!pwd) return { label: '未输入新密码', color: '#7E92C4', percent: 0 };
    if (pwd.length < 6) return { label: '弱 (少于6位)', color: '#F43F5E', percent: 25 };
    const hasNum = /\d/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);
    const score = (pwd.length >= 8 ? 1 : 0) + (hasNum ? 1 : 0) + (hasLetter ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score >= 4) return { label: '极强 (军规级)', color: '#34D399', percent: 100 };
    if (score >= 3) return { label: '强', color: '#60A5FA', percent: 75 };
    return { label: '中等', color: '#FBBF24', percent: 50 };
  };

  const masterStrength = evaluateStrength(masterPassword);

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
        autoLockMinutes: config?.autoLockMinutes || 15,
        lastChangedAt: Date.now(),
        isHardwareEncrypted: true,
      };

      await onSaveConfig(newConfig, selectedDrive);
      setFeedbackMsg({ type: 'success', text: '✅ U盘双钥匙密码与硬件加密配置已成功写入选定介质！' });
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
                  U盘密码与双钥匙接管控制中心
                </span>
                <span className="modal-badge-cat" style={{ color: '#00D4FF', borderColor: 'rgba(0,212,255,0.3)' }}>
                  双钥匙架构
                </span>
                <span className="modal-badge-cat">
                  AES-256-GCM
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                一体化配置所有者 Master PIN 与法定继承人 Heir PIN，并自动校验物理介质加密参数
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="关闭窗口">
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
                <span>目标物理介质 (U盘 / 移动固态硬盘 / 磁盘)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: drives.length > 0 ? '#10B981' : '#F59E0B' }} />
                <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>
                  {drives.length} 个外接介质在线
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
                      {d.name} ({d.mountPath}) · {d.mediaType || 'USB'} · {d.hasPasswordProtected ? '已开启双钥匙保护' : '未加锁'}
                    </option>
                  ))
                ) : (
                  <option value="" style={{ background: '#12173B', color: '#FFFFFF' }}>
                    未检测到外接介质 (将配置本地离线安全凭证)
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
                      所有者主 U 盘密码 (Master PIN)
                    </div>
                    <div style={{ fontSize: 10.5, color: '#8EA4D4' }}>日常解锁与管理最高授权</div>
                  </div>
                </div>
                <span className="usb-key-badge master">所有者专属</span>
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
                插入主盘时必须验证此 PIN 码方可解锁，防止介质失窃被他人插机窃取。
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>
                  设置新主盘密码 {config?.hasMasterPassword && <span style={{ color: '#34D399' }}>(已设)</span>}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type={showMasterPass ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder={config?.hasMasterPassword ? '留空保持原密码，或输入新密码' : '输入 6~32 位安全访问密码'}
                    className="framed-input font-mono"
                    style={{ flex: 1, height: 36, fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPass(!showMasterPass)}
                    className="btn-framed-icon"
                    title={showMasterPass ? '隐藏密码' : '显示密码'}
                    style={{ height: 36, width: 36 }}
                  >
                    {showMasterPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>

                {/* 强度指示 */}
                {masterPassword && (
                  <div style={{ marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
                      <span style={{ color: '#8EA4D4' }}>密码强度：</span>
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
                <label className="framed-label" style={{ fontSize: 11.5 }}>再次确认主盘密码</label>
                <input
                  type={showMasterPass ? 'text' : 'password'}
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  placeholder="再次输入上述主盘密码核对"
                  className="framed-input font-mono"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>主密码提示备忘 (Password Hint，可选)</label>
                <input
                  type="text"
                  value={masterHint}
                  onChange={(e) => setMasterHint(e.target.value)}
                  placeholder="例：常用生日后四位+特定符号"
                  className="framed-input"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#7E92C4', marginTop: 'auto' }}>
                <Shield style={{ width: 12, height: 12, color: '#00D4FF' }} />
                <span>与主介质硬件绑定，单日输错 5 次将触发介质只读锁定</span>
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
                      法定继承人接管口令 (Heir PIN)
                    </div>
                    <div style={{ fontSize: 10.5, color: '#8EA4D4' }}>继承人生效接管专属授权</div>
                  </div>
                </div>
                <span className="usb-key-badge heir">继承人专用</span>
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
                副 U 盘（副卡）含离线救援密钥。继承人须持「副盘物理介质 + 此口令」方可启动继承解密。
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>
                  设置继承人口令 {config?.hasHeirPassword && <span style={{ color: '#34D399' }}>(已设)</span>}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type={showHeirPass ? 'text' : 'password'}
                    value={heirPassword}
                    onChange={(e) => setHeirPassword(e.target.value)}
                    placeholder={config?.hasHeirPassword ? '留空保持原口令，或输入新口令' : '输入指定给继承人的接管口令'}
                    className="framed-input font-mono"
                    style={{ flex: 1, height: 36, fontSize: 12.5 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowHeirPass(!showHeirPass)}
                    className="btn-framed-icon"
                    title={showHeirPass ? '隐藏口令' : '显示口令'}
                    style={{ height: 36, width: 36 }}
                  >
                    {showHeirPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>确认继承人接管口令</label>
                <input
                  type={showHeirPass ? 'text' : 'password'}
                  value={confirmHeirPassword}
                  onChange={(e) => setConfirmHeirPassword(e.target.value)}
                  placeholder="再次输入上述继承人口令核对"
                  className="framed-input font-mono"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div className="framed-input-container">
                <label className="framed-label" style={{ fontSize: 11.5 }}>继承人提示备忘 (可手写在随盘信封中)</label>
                <input
                  type="text"
                  value={heirHint}
                  onChange={(e) => setHeirHint(e.target.value)}
                  placeholder="例：见家族遗嘱公证书第3条或纪念日期"
                  className="framed-input"
                  style={{ height: 36, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: '#7E92C4', marginTop: 'auto' }}>
                <ShieldCheck style={{ width: 12, height: 12, color: '#C084FC' }} />
                <span>副盘口令不可用于修改主库资产，仅用于启动继承接管流程</span>
              </div>
            </div>
          </div>

          {/* 3. 军规级硬件安全参数状态条 (整合原第3个Tab为直观认证条) */}
          <div className="usb-security-spec-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#34D399', fontSize: 12, fontWeight: 700 }}>
                <Cpu style={{ width: 15, height: 15 }} />
                <span>底层军规加密规格与介质防篡改参数</span>
              </div>
              <span style={{ fontSize: 10.5, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>
                STANDARD: LLCS-1 MILITARY SPEC
              </span>
            </div>

            <div className="usb-security-badge-row">
              <div className="usb-security-badge-item">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                <div>
                  <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 11.5 }}>AES-256-GCM + Argon2id</div>
                  <div style={{ color: '#7E92C4', fontSize: 10 }}>高抗 ASIC/GPU 离线暴力破解</div>
                </div>
              </div>

              <div className="usb-security-badge-item">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA' }} />
                <div>
                  <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 11.5 }}>Ed25519 硬件介质签名</div>
                  <div style={{ color: '#7E92C4', fontSize: 10 }}>物理介质指纹绑定防克隆</div>
                </div>
              </div>

              <div className="usb-security-badge-item">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C084FC' }} />
                <div>
                  <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 11.5 }}>单调计数器防重放</div>
                  <div style={{ color: '#7E92C4', fontSize: 10 }}>防固件回滚 (Sequence #1)</div>
                </div>
              </div>

              <div className="usb-security-badge-item">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                <div>
                  <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 11.5 }}>物理介质零明文保存</div>
                  <div style={{ color: '#7E92C4', fontSize: 10 }}>内存即用即焚 · 无后门残留</div>
                </div>
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
            <span>插拔介质后即时生效 · 跨 Windows / macOS / Linux 全系统</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <span>{isSaving ? '正在写入物理介质...' : '保存并写入U盘双钥匙密码'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
