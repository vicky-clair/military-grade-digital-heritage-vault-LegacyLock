import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  RotateCcw,
  Plus,
  Minus,
  X,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Edit,
  HardDrive,
  Usb,
  ShieldCheck,
  Compass,
  Palette,
  ChevronDown,
  Search,
} from 'lucide-react';
import { HeritagePlanConfig, NavCategoryType, UsbDrive, VaultCategory, VaultItem } from '../types';
import { getCategoryDef } from '../services/categories';
import { THEMES, ThemeDefinition } from '../services/themes';
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
  onRescanDrives: () => void;
  isScanningDrives: boolean;
  onOpenHealthCheck: () => void;
  onOpenMigration: () => void;
  onSwitchToHeirMode: () => void;
  currentTheme: ThemeDefinition;
  onSelectTheme: (themeId: string) => void;
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
  onSaveToDrive,
  onImportSuccess,
  onRescanDrives,
  isScanningDrives,
  onOpenHealthCheck,
  onOpenMigration,
  onSwitchToHeirMode,
  currentTheme,
  onSelectTheme,
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
    if (selectedNav === 'external_drive') return true;
    return item.category === selectedNav;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getNavInfo = () => {
    switch (selectedNav) {
      case 'settings':
        return {
          title: '系统设置',
          subtitle: '应用信息、安全提醒、技术规格与数据统计',
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
      case 'external_drive':
      default:
        return { title: '外接式硬碟', subtitle: `掃描外接式硬碟 ${drives.length}` };
    }
  };

  const navInfo = getNavInfo();

  return (
    <main
      className="app-main"
      style={{ background: currentTheme.mainStyle.background }}
      onClick={() => setIsThemeMenuOpen(false)}
    >
      {/* 顶部工具栏 (严格还原截图：右上角 儲存, 複製, U盘密码, 漸變主題 + 窗口控制) */}
      <header
        className="main-topbar"
        style={{ background: currentTheme.mainStyle.topbarBg }}
      >
        <div className="topbar-left">
          <div className="search-container">
            <Search style={{ width: 14, height: 14, color: '#7E92C4' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋已收錄密匙或資產..."
              className="search-input"
            />
          </div>

          <button onClick={() => onAddNew()} className="btn-topbar-add">
            <Plus style={{ width: 14, height: 14 }} />
            <span>添加新资产 / 密匙</span>
          </button>
        </div>

        <div className="topbar-right">
          {/* 用户要求的核心功能：渐变主题切换按钮 */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsThemeMenuOpen(!isThemeMenuOpen);
              }}
              className="action-tile-btn"
              title="切换渐变主题配色"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Palette className="action-tile-icon" style={{ width: 16, height: 16, color: '#FCD34D' }} />
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: currentTheme.previewGradient,
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                />
              </div>
              <span className="action-tile-label">漸變主題</span>
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

          {/* 用户专门要求的核心功能按钮：【U盘密码】 */}
          <button
            onClick={onOpenUsbPassword}
            className="action-tile-btn cyan-highlight"
            title="设置/修改U盘硬件保护PIN码与副盘接管口令"
          >
            <KeyRound className="action-tile-icon" style={{ color: '#00D4FF' }} />
            <span className="action-tile-label" style={{ color: '#38E1FF', fontWeight: 600 }}>
              U盤密碼
            </span>
          </button>

          {/* 分割线 */}
          <div className="window-controls-divider" />

          {/* 窗口控制小按钮（模拟截图右上角下拉、最小化、关闭） */}
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
        {/* 顶部横幅（严格还原截图：3D 外接式硬碟 + 重新掃描胶囊按钮） */}
        <div className="content-header-banner">
          {/* 3D 硬盘与钥匙插画 */}
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
              {selectedNav === 'external_drive' && (
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
                  SMAL 抽象层
                </span>
              )}
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
            </div>

            <div className="header-subtitle-row">
              <span>{navInfo.subtitle}</span>
              {selectedNav === 'external_drive' && (
                <button
                  onClick={onRescanDrives}
                  disabled={isScanningDrives}
                  className="btn-rescan-pill"
                >
                  <RotateCcw style={{ width: 12, height: 12 }} className={isScanningDrives ? 'animate-spin' : ''} />
                  <span>重新掃描</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 视图内容分流：若选中的是「加密导入导出」 */}
        {selectedNav === 'settings' ? (
          <SettingsView
            totalItems={items.length}
            drivesCount={drives.length}
          />
        ) : selectedNav === 'import_export' ? (
          <ImportExportView
            items={items}
            plan={plan}
            drives={drives}
            onImportSuccess={onImportSuccess}
          />
        ) : selectedNav === 'external_drive' && drives.length === 0 ? (
          <div className="empty-state-wrapper">
            {/* 3D 质感打开的紫色纸盒 + 悬浮发光青色放大镜 */}
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

            {/* 严格匹配参考截图文本: 未找到資料。 */}
            <p className="empty-text-label">未找到資料。</p>

            <button
              onClick={() => onAddNew()}
              className="btn-topbar-add"
              style={{ height: 38, padding: '0 20px', borderRadius: 10, fontSize: 13 }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span>添加新密钥 / 资产</span>
            </button>
          </div>
        ) : selectedNav === 'external_drive' ? (
          /* 当有检测到介质时，展示外接式硬碟主介质与副介质管理卡片 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* 主盘卡片 */}
              <div
                style={{
                  background: 'rgba(23, 30, 86, 0.75)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HardDrive style={{ width: 20, height: 20, color: '#34D399' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                      用户主介质 (读写全控)
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' }}>
                    Owner Media
                  </span>
                </div>

                <p style={{ fontSize: 12, color: '#A0B4DE', lineHeight: 1.6, marginBottom: 16 }}>
                  持有所有者 Ed25519 签名私钥，可随时增删修改密库，并对副介质进行签发与口令设定。
                </p>

                <div style={{ background: 'rgba(14, 18, 56, 0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7E92C4' }}>检测驱动器：</span>
                    <span style={{ color: '#34D399', fontFamily: 'JetBrains Mono' }}>
                      {drives.length > 0 ? `${drives[0].name} (${drives[0].mountPath})` : '未插入介质'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7E92C4' }}>U盘密码保护：</span>
                    <span style={{ color: '#00D4FF', fontFamily: 'JetBrains Mono' }}>PIN 码保护就绪</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={onOpenUsbPassword}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      background: '#059669',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      gap: 6,
                    }}
                  >
                    <KeyRound style={{ width: 14, height: 14 }} />
                    <span>设置/修改主U盘密码</span>
                  </button>
                  <button
                    onClick={onSaveToDrive}
                    style={{
                      padding: '0 14px',
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                  >
                    写入同步
                  </button>
                </div>
              </div>

              {/* 副盘卡片 */}
              <div
                style={{
                  background: 'rgba(23, 30, 86, 0.75)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Usb style={{ width: 20, height: 20, color: '#A78BFA' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                      继承人副介质 (只读接管)
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', padding: '2px 8px', borderRadius: 4, background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD' }}>
                    Heir Media
                  </span>
                </div>

                <p style={{ fontSize: 12, color: '#A0B4DE', lineHeight: 1.6, marginBottom: 16 }}>
                  供法定继承人接管使用。单向只读查看，防篡改失效，附带 30 年国际离线单页救援协议。
                </p>

                <div style={{ background: 'rgba(14, 18, 56, 0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7E92C4' }}>副介质槽位：</span>
                    <span style={{ color: '#C4B5FD', fontFamily: 'JetBrains Mono' }}>
                      {drives.length > 1 ? `${drives[1].name} (${drives[1].mountPath})` : '待插入第二介质'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7E92C4' }}>接管口令保护：</span>
                    <span style={{ color: '#E2E8F0', fontFamily: 'JetBrains Mono' }}>双钥匙 + 接管口令</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={onOpenUsbPassword}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      background: '#7C3AED',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      gap: 6,
                    }}
                  >
                    <KeyRound style={{ width: 14, height: 14 }} />
                    <span>设置副U盘接管口令</span>
                  </button>
                  <button
                    onClick={onSwitchToHeirMode}
                    style={{
                      padding: '0 14px',
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF',
                      fontSize: 12,
                    }}
                  >
                    预览接管
                  </button>
                </div>
              </div>
            </div>

            {/* 辅助工具栏 */}
            <div
              style={{
                background: 'rgba(18, 25, 75, 0.65)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#A0B4DE' }}>
                <ShieldCheck style={{ width: 16, height: 16, color: '#00D4FF' }} />
                <span>军规密码学套件：LVCF 2.0 (Argon2id + AES-256-GCM + Ed25519)</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onOpenHealthCheck}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34D399',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  密库 6 项自检
                </button>
                <button
                  onClick={onOpenMigration}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: 'rgba(5, 114, 236, 0.15)',
                    border: '1px solid rgba(5, 114, 236, 0.3)',
                    color: '#60A5FA',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  介质无缝迁移
                </button>
              </div>
            </div>
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
