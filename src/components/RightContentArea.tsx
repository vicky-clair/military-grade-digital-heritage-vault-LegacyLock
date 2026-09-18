import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Plus,
  Minus,
  X,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Edit,
  ShieldCheck,
  Compass,
  Palette,
  ChevronDown,
  Search,
  Lock,
} from 'lucide-react';
import { HeritagePlanConfig, NavCategoryType, UsbDrive, VaultCategory, VaultItem } from '../types';
import { getCategoryDef } from '../services/categories';
import { THEMES, ThemeDefinition } from '../services/themes';
import { copyToClipboard } from '../services/clipboardService';
import { ImportExportView } from './ImportExportView';
import { SettingsView } from './SettingsView';

interface RightContentAreaProps {
  selectedNav: NavCategoryType;
  items: VaultItem[];
  drives: UsbDrive[];
  plan: HeritagePlanConfig;
  onAddNew: (category?: VaultCategory) => void;
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (id: string) => void;
  onOpenUsbPassword: () => void;
  onSaveToDrive?: () => void;
  onCopyAll?: () => void;
  onImportSuccess: (newItems: VaultItem[], isOverwrite: boolean) => void;
  onRescanDrives?: () => void;
  isScanningDrives?: boolean;
  onOpenHealthCheck: () => void;
  onOpenMigration: () => void;
  onSwitchToHeirMode?: () => void;
  currentTheme: ThemeDefinition;
  onSelectTheme: (themeId: string) => void;
  onEmergencyWipe?: () => void;
  onLock?: () => void;
}

export const RightContentArea: React.FC<RightContentAreaProps> = ({
  selectedNav,
  items,
  drives,
  plan,
  onAddNew,
  onEditItem,
  onDeleteItem,
  onOpenUsbPassword,
  onImportSuccess,
  onRescanDrives,
  isScanningDrives,
  onOpenHealthCheck,
  onOpenMigration,
  currentTheme,
  onSelectTheme,
  onEmergencyWipe,
  onLock,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // 筛选资产
  const filteredItems = items.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchUser = (item.username || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchUser && !matchNotes) return false;
    }

    if (selectedNav === 'all') return true;
    if (selectedNav === 'login') return item.category === 'login';
    if (selectedNav === 'note') return item.category === 'note';
    if (selectedNav === 'identity') return item.category === 'identity' || item.category === 'passport' || item.category === 'driverLicense' || item.category === 'ssn';
    if (selectedNav === 'card') return item.category === 'card' || item.category === 'bankAccount';
    if (selectedNav === 'password') return item.category === 'password';
    if (selectedNav === 'document') return item.category === 'document' || item.category === 'softwareLicense' || item.category === 'outdoorLicense' || item.category === 'license';
    if (selectedNav === 'sshKey') return item.category === 'sshKey';
    if (selectedNav === 'apiCredential') return item.category === 'apiCredential';
    if (selectedNav === 'cryptoWallet') return item.category === 'cryptoWallet';
    if (selectedNav === 'server') return item.category === 'server' || item.category === 'database';
    if (selectedNav === 'router') return item.category === 'router';
    if (selectedNav === 'email') return item.category === 'email';
    if (selectedNav === 'membership') return item.category === 'membership' || item.category === 'game' || item.category === 'reward' || item.category === 'medical';
    return item.category === selectedNav;
  });

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text, { isSensitive: true });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 切换分类或搜索时，自动重置明文暴露状态，防范驻留泄露
  useEffect(() => {
    setRevealedIds({});
  }, [selectedNav, searchQuery]);

  const getNavInfo = () => {
    switch (selectedNav) {
      case 'settings':
        return {
          title: '系统设置与安全中心',
          subtitle: '软件版本、LVCF 2.0 规格标准、灾难防范重要提醒与高级安全控制',
        };
      case 'import_export':
        return {
          title: '加密导入与导出',
          subtitle: '基于 AES-256-GCM + PBKDF2 离线高强度加密，支持跨设备迁移与双 U 盘防灾备份',
        };
      case 'all':
        return { title: '所有密鑰', subtitle: `已收錄所有核心密匙與資產 ${items.length} 項` };
      case 'login':
        return { title: '登录信息', subtitle: '網站、在線服務及應用程序的登錄憑據' };
      case 'note':
        return { title: '安全备注', subtitle: '加密便簽、遺囑說明、保險櫃口令與私密筆記' };
      case 'identity':
        return { title: '身份标识', subtitle: '居民身份證、護照、社保號及家庭法定身份' };
      case 'card':
        return { title: '信用卡', subtitle: '銀行卡、國際結算賬戶、存單與支付憑據' };
      case 'password':
        return { title: '独立密码', subtitle: '獨立的設備鎖屏口令、PIN 碼與固件密碼' };
      case 'document':
        return { title: '加密文档', subtitle: '房產證、信託協議、合同公證與軟件許可授權' };
      case 'sshKey':
        return { title: 'SSH 密钥', subtitle: '伺服器運維根密鑰、私鑰與代碼倉庫憑據' };
      case 'apiCredential':
        return { title: 'API 凭据', subtitle: '雲平台接口、AI 服務令牌與開發 API Key' };
      case 'cryptoWallet':
        return { title: '加密钱包', subtitle: '區塊鏈硬件冷錢包、助記詞與數字資產私鑰' };
      case 'server':
        return { title: '服务器与数据库', subtitle: '物理主機、雲 VPS 與生產數據庫憑據' };
      case 'router':
        return { title: '无线路由器', subtitle: '家庭主路由器、WiFi 訪問密碼與網絡存儲 NAS' };
      case 'email':
        return { title: '电子邮件', subtitle: '安全企業郵局、私人密郵與通訊賬號' };
      case 'membership':
        return { title: '会员与资产', subtitle: '私人會員卡、積分獎勵、醫療檔案與遊戲資產' };
      default:
        return { title: '所有密鑰', subtitle: `已收錄所有核心密匙與資產 ${items.length} 項` };
    }
  };

  const navInfo = getNavInfo();

  return (
    <main
      className="app-main"
      style={{ background: currentTheme.mainStyle.background }}
      onClick={() => setIsThemeMenuOpen(false)}
    >
      {/* 顶部工具栏：消除大面积空隙，紧凑且功能完善 */}
      <header
        className="main-topbar"
        style={{ background: currentTheme.mainStyle.topbarBg }}
      >
        <div className="topbar-left">
          {/* 添加新资产/密钥 主行动按钮 (替换原上面的新增密钥按钮) */}
          <button
            onClick={() => onAddNew()}
            className="btn-topbar-add-primary"
            title="点击打开资产分类选择面板，添加新资产或密钥"
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>添加新资产 / 密钥</span>
          </button>

          {/* 搜索框 */}
          <div className="search-container">
            <Search style={{ width: 14, height: 14, color: '#7E92C4' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋已收錄密匙或資產..."
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ color: '#7E92C4', cursor: 'pointer', padding: 2 }}
                title="清除搜索"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        </div>

        {/* 中间快捷安全操作与主题工具组 (重新布局，填充横向空间) */}
        <div className="topbar-center-tools">
          {/* 渐变主题切换按钮 */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsThemeMenuOpen(!isThemeMenuOpen);
              }}
              className="topbar-tool-pill"
              title="切换渐变配色主题"
            >
              <Palette style={{ width: 15, height: 15, color: '#FCD34D' }} />
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: currentTheme.previewGradient,
                  border: '1px solid rgba(255,255,255,0.7)',
                }}
              />
              <span className="tool-pill-label">渐变主题</span>
            </button>

            {/* 主题选择下拉菜单 */}
            {isThemeMenuOpen && (
              <div
                className="theme-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '4px 8px 8px 8px', fontSize: 11, fontWeight: 700, color: '#7E92C4', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 4 }}>
                  選擇漸變配色
                </div>
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      onSelectTheme(th.id);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`theme-option-btn ${th.id === currentTheme.id ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: th.previewGradient,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        }}
                      />
                      <span>{th.name}</span>
                    </div>
                    {th.id === currentTheme.id && <Check style={{ width: 14, height: 14, color: '#00D4FF' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 用户要求的核心功能按钮：【U盘密码】 */}
          <button
            onClick={onOpenUsbPassword}
            className="topbar-tool-pill cyan-highlight"
            title="设置/修改U盘硬件保护PIN码与副盘接管口令"
          >
            <KeyRound style={{ width: 15, height: 15, color: '#00D4FF' }} />
            <span className="tool-pill-label cyan-text">U盘密码</span>
          </button>

          {/* 密库健康自检快捷入口 */}
          <button
            onClick={onOpenHealthCheck}
            className="topbar-tool-pill green-highlight"
            title="执行密库完整性与密码学 6 项自检"
          >
            <ShieldCheck style={{ width: 15, height: 15, color: '#34D399' }} />
            <span className="tool-pill-label green-text">密库自检</span>
          </button>

          {/* 一键立即安全锁屏 */}
          {onLock && (
            <button
              onClick={onLock}
              className="topbar-tool-pill"
              style={{
                borderColor: 'rgba(168, 85, 247, 0.4)',
                background: 'rgba(168, 85, 247, 0.12)',
              }}
              title="立即锁定密库并阻断内存敏感凭据暴露"
            >
              <Lock style={{ width: 14, height: 14, color: '#C084FC' }} />
              <span className="tool-pill-label" style={{ color: '#D8B4FE' }}>立即锁屏</span>
            </button>
          )}
        </div>

        {/* 右侧窗口控制 */}
        <div className="topbar-right">
          <div className="window-controls">
            <button className="win-btn" title="菜单/全屏">
              <ChevronDown style={{ width: 14, height: 14 }} />
            </button>
            <button className="win-btn" title="最小化">
              <Minus style={{ width: 14, height: 14 }} />
            </button>
            <button className="win-btn close" title="关闭">
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </header>

      {/* 主工作滚动区域 */}
      <div className="main-scroll-content">
        {/* 顶部横幅 */}
        <div className="content-header-banner">
          <div className="hd-icon-3d">
            <div className="hd-drive-body">
              <div className="hd-platter-disc" />
            </div>
            <div className="hd-key-3d">
              <KeyRound style={{ width: 13, height: 13 }} />
            </div>
          </div>

          <div className="header-info">
            <div className="header-title-row">
              <h2 className="header-title">{navInfo.title}</h2>
              {selectedNav === 'import_export' && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'rgba(0, 212, 255, 0.15)',
                    color: '#00D4FF',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                  }}
                >
                  AES-256-GCM 认证加密
                </span>
              )}
              {selectedNav === 'settings' && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: 'rgba(167, 139, 250, 0.15)',
                    color: '#C4B5FD',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                  }}
                >
                  LVCF 2.0 规格标准
                </span>
              )}
            </div>

            <div className="header-subtitle-row">
              <span>{navInfo.subtitle}</span>
            </div>
          </div>
        </div>

        {/* 视图内容分流 */}
        {selectedNav === 'settings' ? (
          <SettingsView
            totalItems={items.length}
            drivesCount={drives.length}
            drives={drives}
            onRescanDrives={onRescanDrives}
            isScanningDrives={isScanningDrives}
            currentTheme={currentTheme}
            onSelectTheme={onSelectTheme}
            onOpenHealthCheck={onOpenHealthCheck}
            onOpenMigration={onOpenMigration}
            onOpenUsbPassword={onOpenUsbPassword}
            onEmergencyWipe={onEmergencyWipe}
          />
        ) : selectedNav === 'import_export' ? (
          <ImportExportView
            items={items}
            plan={plan}
            drives={drives}
            onImportSuccess={onImportSuccess}
          />
        ) : filteredItems.length === 0 ? (
          <div className="empty-state-wrapper">
            {/* 3D 质感打开的纸盒 + 青色放大镜 */}
            <div className="empty-3d-box-stage">
              <div className="box-isometric">
                <div className="box-face-front" />
                <div className="box-face-right" />
                <div className="box-flap-left" />
                <div className="box-flap-right" />
                <div className="box-interior" />
              </div>

              <div className="floating-magnifier-3d">
                <div className="magnifier-lens-ring" />
                <div className="magnifier-handle" />
              </div>
            </div>

            <p className="empty-text-label">
              {searchQuery ? `未找到与 “${searchQuery}” 匹配的密匙或资产` : '暂未录入此类别的密匙与资产'}
            </p>
            <p style={{ fontSize: 12, color: '#7E92C4', marginBottom: 16 }}>
              点击下方按钮即可一键录入该分类的账号、密码、密钥或数字资产
            </p>

            <button
              onClick={() => onAddNew()}
              className="btn-topbar-add-primary"
              style={{ height: 40, padding: '0 24px', borderRadius: 10, fontSize: 13, gap: 8 }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span>添加新资产 / 密钥</span>
            </button>
          </div>
        ) : (
          /* 展示资产卡片网格 */
          <div className="vault-grid">
            {filteredItems.map((item) => {
              const catDef = getCategoryDef(item.category);
              const Icon = catDef.icon;
              const isRevealed = revealedIds[item.id];

              return (
                <div key={item.id} className="vault-card">
                  <div className="vault-card-header">
                    <div className="card-title-group">
                      <div className="card-cat-icon" style={{ background: catDef.bgColor }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="card-title-text">{item.title}</h3>
                        <span className="card-cat-label">{catDef.name}</span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        onClick={() => onEditItem(item)}
                        className="btn-card-action"
                        title="编辑"
                      >
                        <Edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="btn-card-action danger"
                        title="删除"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>

                  <div className="card-fields-box">
                    {item.username && (
                      <div className="card-field-row">
                        <span className="card-field-label">账号:</span>
                        <div className="card-field-value-group">
                          <span className="card-field-value">{item.username}</span>
                          <button
                            onClick={() => handleCopy(item.username!, `u-${item.id}`)}
                            className="btn-mini-copy"
                            title="复制账号"
                          >
                            {copiedId === `u-${item.id}` ? (
                              <Check style={{ width: 12, height: 12, color: '#34D399' }} />
                            ) : (
                              <Copy style={{ width: 12, height: 12 }} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.password && (
                      <div className="card-field-row">
                        <span className="card-field-label">密码:</span>
                        <div className="card-field-value-group">
                          <span className="card-field-value">
                            {isRevealed ? item.password : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => toggleReveal(item.id)}
                            className="btn-mini-copy"
                            title={isRevealed ? '隐藏密码' : '显示密码'}
                          >
                            {isRevealed ? (
                              <EyeOff style={{ width: 12, height: 12 }} />
                            ) : (
                              <Eye style={{ width: 12, height: 12 }} />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.password!, `p-${item.id}`)}
                            className="btn-mini-copy"
                            title="复制密码"
                          >
                            {copiedId === `p-${item.id}` ? (
                              <Check style={{ width: 12, height: 12, color: '#34D399' }} />
                            ) : (
                              <Copy style={{ width: 12, height: 12 }} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {item.inheritanceInstructions && (
                    <div className="takeover-badge">
                      <Compass style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        接管指引: {item.inheritanceInstructions}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
