import React, { useState, useEffect } from 'react';
import {
  Info,
  Shield,
  AlertTriangle,
  Clock,
  HardDrive,
  Lock,
  Key,
  FileText,
  Fingerprint,
  ChevronRight,
  CheckCircle2,
  Database,
  Printer,
  Trash2,
  Copy,
  RotateCw,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Check,
  X,
  FileCheck,
  Palette,
} from 'lucide-react';
import { THEMES, ThemeDefinition } from '../services/themes';
import { UsbDrive } from '../types';

interface SettingsViewProps {
  totalItems: number;
  drivesCount: number;
  drives?: UsbDrive[];
  onRescanDrives?: () => void;
  isScanningDrives?: boolean;
  currentTheme?: ThemeDefinition;
  onSelectTheme?: (themeId: string) => void;
  onOpenHealthCheck?: () => void;
  onOpenMigration?: () => void;
  onOpenUsbPassword?: () => void;
  onEmergencyWipe?: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '未知';
  if (bytes >= 1024 * 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
  }
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  totalItems,
  drivesCount,
  drives = [],
  onRescanDrives,
  isScanningDrives = false,
  currentTheme,
  onSelectTheme,
  onOpenHealthCheck,
  onOpenMigration,
  onOpenUsbPassword,
  onEmergencyWipe,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('drives');

  // 本地偏好设置状态
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    return Number(localStorage.getItem('legacylock_autolock') || '15');
  });
  const [autoClearClipboard, setAutoClearClipboard] = useState<boolean>(() => {
    return localStorage.getItem('legacylock_clear_clipboard') !== 'false';
  });
  const [defaultMaskPassword, setDefaultMaskPassword] = useState<boolean>(() => {
    return localStorage.getItem('legacylock_mask_pwd') !== 'false';
  });

  // 紧急销毁安全验证输入
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  // 纸质应急备用单弹窗
  const [isEmergencySheetOpen, setIsEmergencySheetOpen] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);

  useEffect(() => {
    localStorage.setItem('legacylock_autolock', String(autoLockMinutes));
  }, [autoLockMinutes]);

  useEffect(() => {
    localStorage.setItem('legacylock_clear_clipboard', String(autoClearClipboard));
  }, [autoClearClipboard]);

  useEffect(() => {
    localStorage.setItem('legacylock_mask_pwd', String(defaultMaskPassword));
  }, [defaultMaskPassword]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const buildDate = '2026-09-18';
  const vaultId = 'LVCF-2026-MIL-8921';

  const handlePrintSheet = () => {
    window.print();
  };

  const handleCopySheetText = () => {
    const text = `【LegacyLock 军规数字遗产应急恢复与保管指南】
密库唯一识别码: ${vaultId}
安全规范版本: LVCF 2.0 (LLCS-1 / AES-256-GCM)
保管人/所有者: 法定密库所有者
--------------------------------------------------------
一、硬件介质存放位置说明:
  1. 主 U 盘 (01号): 书房实体防火防磁保险箱内部 / 随身物理保管
  2. 副 U 盘 (02号/继承专用): 异地指定银行独立保管箱 / 律师事务所封存
二、应急启用与继承接管流程:
  1. 发生法定继承或紧急接管事件时，由法定继承人出示有效证件提取副介质。
  2. 将介质接入离线计算设备，启动 LegacyLock 离线解密系统。
  3. 输入继承人口令激活只读接管模式，完成全部数字资产查阅与法定过户。
三、关键安全原则:
  - 严禁将密码或介质内容上传至任何公有云网盘或聊天软件！
  - 本密库为纯离线冷存储架构，无密码找回与服务器后门。
生成时间: ${new Date().toLocaleString('zh-CN')}
--------------------------------------------------------`;
    navigator.clipboard.writeText(text);
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2000);
  };

  const handleExecuteWipe = () => {
    if (wipeConfirmText.trim() !== 'ERASE-ALL') {
      alert('请输入精确确认词 ERASE-ALL 以执行销毁');
      return;
    }
    if (onEmergencyWipe) {
      onEmergencyWipe();
    } else {
      localStorage.removeItem('legacylock_items');
      localStorage.removeItem('legacylock_plan');
      window.location.reload();
    }
    setIsWipeModalOpen(false);
  };

  return (
    <div className="settings-view-container">
      {/* 顶部设置横幅与状态指示 */}
      <div className="settings-hero-banner">
        <div className="settings-hero-left">
          <div className="settings-hero-icon">
            <Sliders style={{ width: 24, height: 24, color: '#00D4FF' }} />
          </div>
          <div>
            <h2 className="settings-hero-title">系统设置与军规安全控制中心</h2>
            <p className="settings-hero-sub">
              软件版本、LVCF 2.0 规格标准、灾难防范重要提醒与高级安全控制
            </p>
          </div>
        </div>
        <div className="settings-hero-badges">
          <span className="badge-pill cyan">离线冷存储</span>
          <span className="badge-pill green">AES-256-GCM</span>
          <span className="badge-pill purple">LVCF 2.0</span>
        </div>
      </div>

      {/* ====== 0. 外部存储硬件与移动硬盘/U盘检测状态 (跨平台全面识别) ====== */}
      <div className="settings-card" onClick={() => toggleSection('drives')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>
            <HardDrive style={{ width: 18, height: 18, color: '#00D4FF' }} />
          </div>
          <div className="settings-card-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="settings-card-title">外部存储硬件与介质识别中心</h3>
              <span className="settings-inline-tag" style={{ background: drives.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: drives.length > 0 ? '#34D399' : '#F87171' }}>
                {drives.length > 0 ? `${drives.length} 盘在线` : '等待插入'}
              </span>
            </div>
            <p className="settings-card-desc">
              已全面支持 Windows (含 D: 盘及后续盘符)、macOS (/Volumes) 与 Linux (lsblk)，完美识别移动硬盘 (HDD)、移动固态 (SSD) 与普通 U 盘
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onRescanDrives && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRescanDrives();
                }}
                disabled={isScanningDrives}
                className="btn-feature-action cyan"
                style={{ height: 30, padding: '0 10px', fontSize: 11.5 }}
                title="立即重新扫描所有外接移动硬盘与U盘"
              >
                <RotateCw style={{ width: 13, height: 13, animation: isScanningDrives ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isScanningDrives ? '正在扫描...' : '重新检测'}</span>
              </button>
            )}
            <ChevronRight
              className={`settings-chevron ${expandedSection === 'drives' ? 'open' : ''}`}
              style={{ width: 18, height: 18 }}
            />
          </div>
        </div>

        {expandedSection === 'drives' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            {drives.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                <HardDrive style={{ width: 36, height: 36, color: '#64748B', margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0', marginBottom: 4 }}>
                  未检测到已连接的外部存储设备
                </div>
                <div style={{ fontSize: 12, color: '#7E92C4', maxWidth: 500, margin: '0 auto' }}>
                  请将您的移动硬盘（USB 移动机械/固态硬盘）或普通 U 盘插入电脑 USB 接口，并点击右上角的「重新检测」。本系统已解除盘符限制，自动深度扫描全平台外部介质。
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: '#9BB0DD', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399' }} />
                  <span>已成功探查并匹配到以下存储设备（包含您的移动硬盘）：</span>
                </div>
                {drives.map((d, idx) => (
                  <div key={d.mountPath || idx} className="settings-drive-card">
                    <div className="drive-card-header">
                      <div className="drive-card-title-group">
                        <div className="drive-type-icon">
                          <HardDrive style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <div className="drive-card-title">{d.name}</div>
                          <div className="drive-card-sub">
                            挂载路径: <strong style={{ color: '#00D4FF' }}>{d.mountPath}</strong>
                            {d.fileSystem && ` | 文件系统: ${d.fileSystem}`}
                            {d.size ? ` | 总容量: ${formatBytes(d.size)}` : ''}
                            {d.freeSpace ? ` (可用空间: ${formatBytes(d.freeSpace)})` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="drive-badge-group">
                        {d.mediaType === 'UsbHDD' ? (
                          <span className="drive-tag hdd">移动硬盘 (HDD)</span>
                        ) : d.mediaType === 'UsbSSD' ? (
                          <span className="drive-tag usb">移动固态 (SSD)</span>
                        ) : (
                          <span className="drive-tag usb">USB 闪存盘</span>
                        )}
                        {d.isExternal && <span className="drive-tag external">外部存储 (USB)</span>}
                        {d.isSystem && <span className="drive-tag system">本地系统卷</span>}
                      </div>
                    </div>

                    {/* 密钥探测指示 */}
                    <div className="drive-key-status">
                      <div className={`drive-key-indicator ${d.hasUserKey ? 'active' : 'inactive'}`}>
                        {d.hasUserKey ? <Check style={{ width: 13, height: 13 }} /> : <X style={{ width: 13, height: 13 }} />}
                        <span>主盘密钥 (user-key.bin)</span>
                      </div>
                      <div className={`drive-key-indicator ${d.hasHeirKey ? 'active' : 'inactive'}`}>
                        {d.hasHeirKey ? <Check style={{ width: 13, height: 13 }} /> : <X style={{ width: 13, height: 13 }} />}
                        <span>副盘密钥 (heir-key.bin)</span>
                      </div>
                      <div className={`drive-key-indicator ${d.hasConfig ? 'active' : 'inactive'}`}>
                        {d.hasConfig ? <Check style={{ width: 13, height: 13 }} /> : <X style={{ width: 13, height: 13 }} />}
                        <span>时效凭据 (config.bin)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== 1. 应用信息与技术规格 ====== */}
      <div className="settings-card" onClick={() => toggleSection('about')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper about">
            <Info style={{ width: 18, height: 18, color: '#60A5FA' }} />
          </div>
          <div className="settings-card-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="settings-card-title">应用说明与技术架构</h3>
              <span className="settings-inline-tag">v2.5.0 LTS</span>
            </div>
            <p className="settings-card-desc">软件版本、密库协议规范、加密算法套件与零遥测声明</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'about' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'about' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-info-grid">
              <div className="settings-info-item">
                <span className="settings-info-label">软件全称</span>
                <span className="settings-info-value">LegacyLock 军规遗产密钥库</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">软件版本</span>
                <span className="settings-info-value mono highlight">v2.5.0 LTS (Military Build)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">容器标准</span>
                <span className="settings-info-value mono">LVCF 2.0 (LegacyLock Vault Container Format)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">核心加密算法</span>
                <span className="settings-info-value mono">LLCS-1 (AES-256-GCM 认证加密)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">密钥派生函数</span>
                <span className="settings-info-value mono">PBKDF2-HMAC-SHA256 (100,000 轮安全迭代)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">数字签名体制</span>
                <span className="settings-info-value mono">Ed25519 所有者离线非对称签名</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">防回滚保护</span>
                <span className="settings-info-value mono">递增序列号 (Seq) + 世代代数 (Gen) 双校验</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">离线独立性</span>
                <span className="settings-info-value highlight">100% 纯离线运行，零云端、零网络上报、零后门</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">构建发布日期</span>
                <span className="settings-info-value mono">{buildDate}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">设计准则</span>
                <span className="settings-info-value">军规级「双保险箱」跨世代数字遗产安全继承协议</span>
              </div>
            </div>

            <div className="settings-spec-callout">
              <CheckCircle2 style={{ width: 16, height: 16, color: '#10B981', flexShrink: 0 }} />
              <span>
                <strong>零知识与物理主权声明：</strong>
                LegacyLock 为独立无服务器应用程序，不设置任何中心化云端服务器或远程分析接口。
                所有密文数据、对称密钥及硬件签名完全存放在用户个人指定的物理存储介质（如 USB 闪存盘、加密移动硬盘）内，
                用户拥有绝对的数据物理掌控权与数学排他性。
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ====== 2. 重要安全提醒与灾难防范 (详实完整) ====== */}
      <div className="settings-card" onClick={() => toggleSection('warnings')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper warning">
            <AlertTriangle style={{ width: 18, height: 18, color: '#FBBF24' }} />
          </div>
          <div className="settings-card-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="settings-card-title">重要安全提醒与灾难防范指南</h3>
              <span className="settings-inline-tag warning">极重要</span>
            </div>
            <p className="settings-card-desc">U 盘丢失后果、无后门重置机制、双盘异地容灾与介质老化防范</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'warnings' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'warnings' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-warning-list">
              {/* 警示 1: U盘丢失永久灭失 */}
              <div className="settings-warning-item critical">
                <div className="warning-icon-badge critical">
                  <AlertTriangle style={{ width: 16, height: 16 }} />
                </div>
                <div className="warning-content">
                  <h4 className="warning-title">🚨 U 盘丢失或物理损毁 = 数据永久不可恢复</h4>
                  <p className="warning-desc">
                    LegacyLock 遵循高等级密码学安全规范，<strong>没有任何云端服务器中继或同步副本</strong>。
                    所有密匙资产仅存在于您的物理移动介质及本地加密容器中。如果主 U 盘遗失、被意外格式化或物理损坏，
                    且事先未制作副 U 盘备份，<strong>任何机构、专家或本软件开发者均无法恢复您的数据</strong>，将造成永久不可逆损失！
                  </p>
                </div>
              </div>

              {/* 警示 2: 忘记密码无法重置 */}
              <div className="settings-warning-item critical">
                <div className="warning-icon-badge critical">
                  <Key style={{ width: 16, height: 16 }} />
                </div>
                <div className="warning-content">
                  <h4 className="warning-title">🚨 忘记 U 盘保护口令 / PIN 码 = 永久丧失访问权</h4>
                  <p className="warning-desc">
                    本系统绝不保留任何超级密码、后门解密接口或短信找回通道。
                    AES-256-GCM 结合 100,000 轮 PBKDF2 强化运算，在数学逻辑上使穷举破解在宇宙物理尺度内不可行。
                    请务必牢记您设定的口令，并建议结合下方的「纸质应急密封单」进行离线物理留档。
                  </p>
                </div>
              </div>

              {/* 警示 3: 双U盘异地容灾 */}
              <div className="settings-warning-item notice">
                <div className="warning-icon-badge notice">
                  <HardDrive style={{ width: 16, height: 16 }} />
                </div>
                <div className="warning-content">
                  <h4 className="warning-title">🛡️ 强烈执行「双 U 盘异地容灾」策略</h4>
                  <p className="warning-desc">
                    军规级遗产保管的核心是物理隔离冗余：
                    <br />• <strong>主介质（所有者盘）</strong>：日常存放在随身或书房，用于日常添加、编辑和更新密码；
                    <br />• <strong>副介质（继承人接管盘）</strong>：定期同步后密封存放于银行保险柜、异地亲属处或防火保管箱。
                    单点介质遭遇火灾、被盗或硬件损坏时，异地副盘即可无缝接管。
                  </p>
                </div>
              </div>

              {/* 警示 4: 继承人接管单向只读 */}
              <div className="settings-warning-item info">
                <div className="warning-icon-badge info">
                  <Shield style={{ width: 16, height: 16 }} />
                </div>
                <div className="warning-content">
                  <h4 className="warning-title">⏳ 继承人接管模式具有严格「单向只读」防护</h4>
                  <p className="warning-desc">
                    当继承人使用副介质激活接管模式时，系统仅允许读取与查阅资产，禁止篡改、删除或批量清空已有历史数据。
                    这确保了原密库数据的法律完整性与防抵赖特性。
                  </p>
                </div>
              </div>

              {/* 警示 5: 闪存介质寿命防范 */}
              <div className="settings-warning-item info">
                <div className="warning-icon-badge info">
                  <Clock style={{ width: 16, height: 16 }} />
                </div>
                <div className="warning-content">
                  <h4 className="warning-title">⚠️ 闪存物理介质寿命与定期数据重写刷新</h4>
                  <p className="warning-desc">
                    普通 USB 闪存盘依靠电荷浮栅存储，长年断电冷存（超过 2~3 年）可能发生电荷衰减导致数据位反转。
                    建议每 12~18 个月将冷存 U 盘插入电脑进行一次「密库健康自检」，并利用「介质无缝迁移」对闪存块进行数据刷新重写。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 3. 实用设置与功能扩展 ====== */}
      <div className="settings-card" onClick={() => toggleSection('features')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper features">
            <Sliders style={{ width: 18, height: 18, color: '#34D399' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">实用安全功能与偏好设置</h3>
            <p className="settings-card-desc">自动锁屏超时、剪贴板清空、自检中心、纸质备用单与介质迁移</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'features' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'features' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-controls-grid">
              {/* 快捷自检与工具入口 */}
              <div className="settings-control-box">
                <div className="control-box-header">
                  <FileCheck style={{ width: 18, height: 18, color: '#34D399' }} />
                  <div>
                    <div className="control-box-title">密库健康与密码学自检</div>
                    <div className="control-box-desc">校验 AES 密文完整性、Ed25519 签名与防回滚计数器</div>
                  </div>
                </div>
                <button
                  onClick={onOpenHealthCheck}
                  className="btn-feature-action"
                  title="执行密库完整性与 6 项安全自检"
                >
                  <RotateCw style={{ width: 14, height: 14 }} />
                  <span>立即执行健康自检</span>
                </button>
              </div>

              {/* 硬件介质保护口令设置 */}
              <div className="settings-control-box">
                <div className="control-box-header">
                  <Key style={{ width: 18, height: 18, color: '#00D4FF' }} />
                  <div>
                    <div className="control-box-title">U 盘硬件口令保护</div>
                    <div className="control-box-desc">配置主 U 盘 PIN 码与副盘继承人独立口令</div>
                  </div>
                </div>
                <button
                  onClick={onOpenUsbPassword}
                  className="btn-feature-action cyan"
                  title="配置/修改 U 盘密码"
                >
                  <Lock style={{ width: 14, height: 14 }} />
                  <span>配置 U 盘口令</span>
                </button>
              </div>

              {/* 纸质应急密封单生成 */}
              <div className="settings-control-box">
                <div className="control-box-header">
                  <Printer style={{ width: 18, height: 18, color: '#FCD34D' }} />
                  <div>
                    <div className="control-box-title">纸质应急救援密封单</div>
                    <div className="control-box-desc">生成可物理归档、盖印密封的 A4 离线继承交接卡片</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsEmergencySheetOpen(true)}
                  className="btn-feature-action amber"
                  title="生成并打印纸质应急备用单"
                >
                  <FileText style={{ width: 14, height: 14 }} />
                  <span>生成纸质备用单</span>
                </button>
              </div>

              {/* 介质平滑迁移向导 */}
              <div className="settings-control-box">
                <div className="control-box-header">
                  <HardDrive style={{ width: 18, height: 18, color: '#C084FC' }} />
                  <div>
                    <div className="control-box-title">介质无损迁移升级</div>
                    <div className="control-box-desc">将密库由旧 U 盘克隆迁移至新高速移动 SSD 或机械硬盘</div>
                  </div>
                </div>
                <button
                  onClick={onOpenMigration}
                  className="btn-feature-action purple"
                  title="启动介质无缝迁移"
                >
                  <ArrowRight style={{ width: 14, height: 14 }} />
                  <span>启动介质迁移</span>
                </button>
              </div>
            </div>

            {/* 偏好开关列表 */}
            <div className="settings-toggles-section">
              <h4 className="toggles-header-title">操作安全偏好</h4>

              {/* 自动锁定时间 */}
              <div className="settings-toggle-row">
                <div>
                  <div className="toggle-label">无操作自动锁定时间</div>
                  <div className="toggle-sub">离开电脑后自动锁定界面，防范临时他人窥视</div>
                </div>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="settings-select-input"
                >
                  <option value={5}>5 分钟</option>
                  <option value={15}>15 分钟 (推荐)</option>
                  <option value={30}>30 分钟</option>
                  <option value={60}>60 分钟</option>
                  <option value={0}>从不自动锁定</option>
                </select>
              </div>

              {/* 剪贴板自动清空 */}
              <div className="settings-toggle-row">
                <div>
                  <div className="toggle-label">敏感凭据剪贴板自动清空</div>
                  <div className="toggle-sub">复制密码或私钥后 30 秒自动清除系统剪切板，防恶意嗅探</div>
                </div>
                <button
                  onClick={() => setAutoClearClipboard(!autoClearClipboard)}
                  className={`settings-switch ${autoClearClipboard ? 'active' : ''}`}
                >
                  <div className="switch-knob" />
                </button>
              </div>

              {/* 默认掩码隐藏密码 */}
              <div className="settings-toggle-row">
                <div>
                  <div className="toggle-label">资产卡片默认以掩码隐藏密码</div>
                  <div className="toggle-sub">打开密匙库时密码显示为 ••••••••，点击眼睛方可明文查看</div>
                </div>
                <button
                  onClick={() => setDefaultMaskPassword(!defaultMaskPassword)}
                  className={`settings-switch ${defaultMaskPassword ? 'active' : ''}`}
                >
                  <div className="switch-knob" />
                </button>
              </div>
            </div>

            {/* 主题配色外观设置 (永久持久化保存) */}
            <div style={{ marginTop: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <h4 className="toggles-header-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Palette style={{ width: 15, height: 15, color: '#FCD34D' }} />
                    <span>系统外观与渐变主题（已开启永久保存）</span>
                  </h4>
                  <div style={{ fontSize: 12, color: '#9BB0DD' }}>
                    选择喜爱的配色方案。系统已绑定底层配置文件，重启应用将永久保留最后一次修改，杜绝还原。
                  </div>
                </div>
                {currentTheme && (
                  <span className="badge-pill cyan" style={{ fontSize: 11 }}>
                    当前: {currentTheme.name}
                  </span>
                )}
              </div>

              <div className="theme-selector-grid">
                {THEMES.map((th) => {
                  const isActive = currentTheme?.id === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => onSelectTheme && onSelectTheme(th.id)}
                      className={`theme-card-btn ${isActive ? 'active' : ''}`}
                      title={`点击切换为【${th.name}】并永久保存`}
                    >
                      <div className="theme-card-preview" style={{ background: th.previewGradient }} />
                      <div className="theme-card-info">
                        <div>
                          <div className="theme-card-name">{th.name}</div>
                          <div className="theme-card-en">{th.englishName}</div>
                        </div>
                        {isActive && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00D4FF', fontSize: 11, fontWeight: 700 }}>
                            <Check style={{ width: 14, height: 14 }} />
                            <span>使用中</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 全链路 UTF-8 与防乱码技术标准 */}
            <div className="settings-encoding-box" style={{ marginTop: 20 }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: '#00D4FF', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                  全链路国际标准 UTF-8 编码与防乱码工程认证
                </div>
                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
                  为确保您输入的资产名称、中文备注、多语言字段、特殊标点与 Emoji 后期显示<strong>绝对不会发生乱码</strong>，系统已在内核层落实四项保障：
                  <br />• <strong>底层存储标准</strong>：全量密文容器与 JSON 格式统一采用严谨的 UTF-8 字节流序列化；
                  <br />• <strong>双向编解码</strong>：导入与导出均使用标准的 TextEncoder / TextDecoder API，杜绝操作系统 ANSI/GBK 字符页污染；
                  <br />• <strong>字体渲染增强</strong>：采用多层级中文字体备援栈（微软雅黑、PingFang SC、Noto Sans SC），排除了字体回退造成的缺字方块（Tofu）；
                  <br />• <strong>跨平台一致性</strong>：在 Windows、macOS 与 Linux 间自由互转导入导出，字符哈希 100% 字节对齐。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 4. 数据统计概览 ====== */}
      <div className="settings-card" onClick={() => toggleSection('stats')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper stats">
            <Database style={{ width: 18, height: 18, color: '#34D399' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">数据概览与状态</h3>
            <p className="settings-card-desc">当前保险库已收录资产规模与运行参数</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'stats' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'stats' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-stats-grid">
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <FileText style={{ width: 20, height: 20, color: '#A78BFA' }} />
                </div>
                <div className="stat-number">{totalItems}</div>
                <div className="stat-label">已收录数字资产</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <HardDrive style={{ width: 20, height: 20, color: '#34D399' }} />
                </div>
                <div className="stat-number">{drivesCount}</div>
                <div className="stat-label">已挂载硬件介质</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <Lock style={{ width: 20, height: 20, color: '#FBBF24' }} />
                </div>
                <div className="stat-number">AES-256</div>
                <div className="stat-label">对称密码强度</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <Fingerprint style={{ width: 20, height: 20, color: '#00D4FF' }} />
                </div>
                <div className="stat-number">LVCF 2.0</div>
                <div className="stat-label">密库协议规范</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 5. 危险区域：紧急数据销毁 (Emergency Wipe) ====== */}
      <div className="settings-card danger" onClick={() => toggleSection('danger')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper danger">
            <ShieldAlert style={{ width: 18, height: 18, color: '#EF4444' }} />
          </div>
          <div className="settings-card-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="settings-card-title text-danger">危险区域：军规级紧急数据销毁</h3>
              <span className="settings-inline-tag danger">不可逆</span>
            </div>
            <p className="settings-card-desc">面临不可抗力或紧急胁迫时的安全数据擦除与彻底清空</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'danger' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'danger' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-danger-box">
              <div className="danger-box-icon">
                <AlertTriangle style={{ width: 24, height: 24, color: '#EF4444' }} />
              </div>
              <div className="danger-box-content">
                <h4>销毁所有本地缓存、密库资产与配置</h4>
                <p>
                  此操作将立即从当前设备彻底抹除所有保存在本地的密匙记录、继承人计划以及缓存密钥。
                  若未在物理 U 盘中保留独立离线副本，所有数据将彻底无法恢复！
                </p>
                <button
                  onClick={() => setIsWipeModalOpen(true)}
                  className="btn-danger-wipe"
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                  <span>发起紧急数据安全销毁</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 纸质应急救援密封单弹窗 ====== */}
      {isEmergencySheetOpen && (
        <div className="modal-backdrop" onClick={() => setIsEmergencySheetOpen(false)}>
          <div
            className="modal-box sheet-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Printer style={{ width: 20, height: 20, color: '#FCD34D' }} />
                <h3 className="modal-title">纸质应急备用密封单 (Paper Key Sheet)</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEmergencySheetOpen(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div className="sheet-preview-card" id="printable-emergency-sheet">
              <div className="sheet-top-row">
                <div>
                  <div className="sheet-title-text">LegacyLock 军规遗产密钥库</div>
                  <div className="sheet-sub-text">物理应急交接与继承人解密密封卡</div>
                </div>
                <div className="sheet-stamp">机密 · 严禁联网</div>
              </div>

              <div className="sheet-field-grid">
                <div className="sheet-field">
                  <span className="sheet-label">密库唯一标识</span>
                  <span className="sheet-val mono">{vaultId}</span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-label">容器标准</span>
                  <span className="sheet-val mono">LVCF 2.0 / AES-256-GCM</span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-label">主 U 盘保管位置</span>
                  <span className="sheet-val dotted-line">________________________________</span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-label">副 U 盘（继承盘）位置</span>
                  <span className="sheet-val dotted-line">________________________________</span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-label">法定指定继承人</span>
                  <span className="sheet-val dotted-line">________________________________</span>
                </div>
                <div className="sheet-field">
                  <span className="sheet-label">紧急联络人电话</span>
                  <span className="sheet-val dotted-line">________________________________</span>
                </div>
              </div>

              <div className="sheet-instructions-box">
                <strong>重要应急解密步骤指引：</strong>
                <ol>
                  <li>请在受信任的纯净计算设备上插入指定副介质（严禁插入带有间谍软件的公共网吧电脑）；</li>
                  <li>运行随盘附带的 LegacyLock 离线解密系统；</li>
                  <li>选择进入「继承人只读接管模式」，输入事先约定的继承人口令；</li>
                  <li>系统将即时还原全部登录凭据、数字资产与法律备注文档。</li>
                </ol>
              </div>

              <div className="sheet-footer-sign">
                <div>所有者签名: _______________</div>
                <div>归档签署日期: ____年__月__日</div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button onClick={handleCopySheetText} className="btn-secondary" style={{ gap: 6 }}>
                {copiedSheet ? <Check style={{ width: 14, height: 14, color: '#10B981' }} /> : <Copy style={{ width: 14, height: 14 }} />}
                <span>{copiedSheet ? '已复制文本' : '复制文档内容'}</span>
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setIsEmergencySheetOpen(false)} className="btn-secondary">
                  关闭
                </button>
                <button onClick={handlePrintSheet} className="btn-primary" style={{ gap: 6 }}>
                  <Printer style={{ width: 14, height: 14 }} />
                  <span>打印此单</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== 紧急销毁二次确认弹窗 ====== */}
      {isWipeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsWipeModalOpen(false)}>
          <div
            className="modal-box danger-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert style={{ width: 20, height: 20, color: '#EF4444' }} />
                <h3 className="modal-title text-danger">警告：确认彻底安全销毁？</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsWipeModalOpen(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', fontSize: 13, color: '#E2E8F0', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 12, color: '#FCA5A5' }}>
                此操作具有毁灭性且绝对不可撤销！本地的所有数字资产、密码记录和配置将被即刻擦除覆写。
              </p>
              <p style={{ marginBottom: 8, fontSize: 12, color: '#94A3B8' }}>
                请在下方文本框中手动输入确认词 <strong style={{ color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>ERASE-ALL</strong> 以授权销毁：
              </p>
              <input
                type="text"
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="请输入 ERASE-ALL"
                className="danger-confirm-input"
                autoFocus
              />
            </div>

            <div className="modal-footer">
              <button onClick={() => setIsWipeModalOpen(false)} className="btn-secondary">
                取消放弃
              </button>
              <button
                onClick={handleExecuteWipe}
                disabled={wipeConfirmText.trim() !== 'ERASE-ALL'}
                className="btn-danger-confirm"
              >
                确认立即销毁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
