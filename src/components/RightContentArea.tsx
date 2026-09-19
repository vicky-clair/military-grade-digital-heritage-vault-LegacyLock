/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 主工作区与顶部平衡工具栏组件 (RightContentArea)
 * ============================================================================
 * 
 * 界面交互职责：
 * 1. 顶部紧凑平衡工具栏：
 *    - [+ 添加新资产 / 密钥] 主行动按钮与实时模糊搜索框；
 *    - 快捷工具群：[渐变主题切换]、[U盘密码配置]、[密库健康自检]、[一键立即锁屏]；
 * 2. 资产列表渲染工作区：
 *    - 军规级规格的卡片式凭证布局，默认密码掩码隐藏防偷窥；
 *    - 集成 30 秒自动清空的军规安全剪贴板复制；
 *    - 资产单项快速编辑、自定义字段展开与删除防误触确认；
 * 3. 视图无缝切换路由：
 *    - 导航选中 'import_export' 时渲染军规加密备份导入导出视图 (ImportExportView)；
 *    - 导航选中 'settings' 时渲染系统设置与安全控制中心视图 (SettingsView)。
 */

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
  Paperclip,
  Download,
  Crown,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import { HeritagePlanConfig, NavCategoryType, UsbDrive, VaultCategory, VaultItem, VaultAttachment } from '../types';
import { CATEGORIES, getCategoryDef } from '../services/categories';
import { THEMES, ThemeDefinition } from '../services/themes';
import { copyToClipboard } from '../services/clipboardService';
import { getSubscriptionState, getTrialDaysRemaining, isTrialActive } from '../services/subscriptionService';
import { ImportExportView } from './ImportExportView';
import { SettingsView } from './SettingsView';

function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleDownloadAttachment(att: VaultAttachment) {
  const link = document.createElement('a');
  link.href = att.data;
  link.download = att.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 主内容区属性接口
 */
interface RightContentAreaProps {
  /** 当前选中的导航分类 */
  selectedNav: NavCategoryType;
  /** 当前全部资产项列表 */
  items: VaultItem[];
  /** 探测到的外部硬件介质列表 */
  drives: UsbDrive[];
  /** 遗产继承计划配置 */
  plan: HeritagePlanConfig;
  /** 唤起添加新资产弹窗回调 */
  onAddNew: (category?: VaultCategory) => void;
  /** 唤起编辑资产弹窗回调 */
  onEditItem: (item: VaultItem) => void;
  /** 删除资产项回调 */
  onDeleteItem: (id: string) => void;
  /** 唤起 U 盘双钥匙密码配置弹窗回调 */
  onOpenUsbPassword: () => void;
  /** 保存至物理驱动器回调 */
  onSaveToDrive?: () => void;
  /** 全部复制回调 */
  onCopyAll?: () => void;
  /** 密库导入成功后的数据合并回调 */
  onImportSuccess: (newItems: VaultItem[], isOverwrite: boolean) => void;
  /** 重新扫描外部驱动器回调 */
  onRescanDrives?: () => void;
  /** 是否正在执行硬件驱动器扫描 */
  isScanningDrives?: boolean;
  /** 唤起密库 6 项健康体检弹窗回调 */
  onOpenHealthCheck: () => void;
  /** 唤起介质平滑升级迁移弹窗回调 */
  onOpenMigration: () => void;
  /** 切换至继承人只读接管模拟视图回调 */
  onSwitchToHeirMode?: () => void;
  /** 当前启用的视觉主题配置 */
  currentTheme: ThemeDefinition;
  /** 切换主题回调 */
  onSelectTheme: (themeId: string) => void;
  /** 触发紧急擦除回调 */
  onEmergencyWipe?: () => void;
  /** 触发锁屏回调 */
  onLock?: () => void;
  /** 触发重新载入官方示例数据回调 */
  onReloadMockData?: () => void;
  /** 唤起修改/设置锁屏密码弹窗回调 */
  onOpenChangePassword?: () => void;
  /** 请求关闭应用窗口回调 */
  onCloseRequest?: () => void;
  /** 是否处于试用到期只读保护模式 */
  isReadOnly?: boolean;
  /** 唤起尊享订阅弹窗回调 */
  onOpenSubscription?: () => void;
  /** 是否允许修改 (继承人双 U 盘只读模式下为 false) */
  canModify?: boolean;
  /** 请求接管控制权回调 (打开 TakeoverControlModal) */
  onRequestTakeover?: () => void;
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
  onReloadMockData,
  onOpenChangePassword,
  onCloseRequest,
  isReadOnly = false,
  onOpenSubscription,
  canModify = true,
  onRequestTakeover,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [revealedCustomFieldIds, setRevealedCustomFieldIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // 订阅与试用状态跟踪
  const [subState, setSubState] = useState(() => getSubscriptionState());

  useEffect(() => {
    const handleSubChange = (e: any) => {
      setSubState(e.detail || getSubscriptionState());
    };
    window.addEventListener('legacylock:subscription-changed', handleSubChange);
    return () => window.removeEventListener('legacylock:subscription-changed', handleSubChange);
  }, []);

  const trialDays = getTrialDaysRemaining(subState);
  const isTrial = isTrialActive(subState);

  // 综合只读判断：试用到期只读 或 继承人双 U 盘只读模式
  const effectiveReadOnly = isReadOnly || !canModify;

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

  const toggleCustomFieldReveal = (key: string) => {
    setRevealedCustomFieldIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 切换分类或搜索时，自动重置明文暴露状态，防范驻留泄露
  useEffect(() => {
    setRevealedIds({});
    setRevealedCustomFieldIds({});
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

  const isDirectCategory =
    selectedNav !== 'all' &&
    selectedNav !== 'settings' &&
    selectedNav !== 'import_export' &&
    CATEGORIES.some((c) => c.id === selectedNav);

  const categoryActionTitle = selectedNav === 'all' ? '添加新资产 / 密钥' : navInfo.title;

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
          {/* 主行动按钮 (动态对齐当前分类标题，如「+ 登录信息」) */}
          <button
            onClick={() => {
              if (effectiveReadOnly) {
                if (!canModify && onRequestTakeover) {
                  onRequestTakeover();
                } else if (onOpenSubscription) {
                  onOpenSubscription();
                }
              } else {
                onAddNew(isDirectCategory ? (selectedNav as VaultCategory) : undefined);
              }
            }}
            className="btn-topbar-add-primary"
            title={
              effectiveReadOnly
                ? !canModify
                  ? '当前处于继承人只读模式，需接管控制权后方可录入新资产'
                  : '当前处于试用到期只读模式，点击升级订阅以录入新资产'
                : selectedNav === 'all'
                ? '点击打开资产分类选择面板，添加新资产或密钥'
                : `添加新「${categoryActionTitle}」`
            }
          >
            <Plus style={{ width: 15, height: 15 }} />
            <span>{categoryActionTitle}</span>
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

          {/* 订阅与 3 个月试用期状态快捷入口 */}
          {onOpenSubscription && (
            <button
              onClick={onOpenSubscription}
              className="topbar-tool-pill"
              style={
                subState.isSubscribed
                  ? {
                      borderColor: 'rgba(245, 158, 11, 0.5)',
                      background: 'rgba(245, 158, 11, 0.15)',
                    }
                  : isTrial
                  ? {
                      borderColor: 'rgba(0, 212, 255, 0.4)',
                      background: 'rgba(0, 212, 255, 0.1)',
                    }
                  : {
                      borderColor: 'rgba(245, 158, 11, 0.65)',
                      background: 'rgba(245, 158, 11, 0.22)',
                      boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
                    }
              }
              title={
                subState.isSubscribed
                  ? '尊享订阅会员中，点击管理或续费'
                  : isTrial
                  ? `当前处于 3 个月免费试用期（还剩 ${trialDays} 天），点击查看权益`
                  : '3 个月免费试用已结束，当前处于只读保护模式，点击开通订阅恢复修改'
              }
            >
              {subState.isSubscribed ? (
                <>
                  <Crown style={{ width: 14, height: 14, color: '#F59E0B' }} />
                  <span className="tool-pill-label" style={{ color: '#FDE68A', fontWeight: 600 }}>
                    尊享会员
                  </span>
                </>
              ) : isTrial ? (
                <>
                  <Gift style={{ width: 14, height: 14, color: '#00D4FF' }} />
                  <span className="tool-pill-label cyan-text">
                    试用期 ({trialDays}天)
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B' }} />
                  <span className="tool-pill-label" style={{ color: '#FDE68A', fontWeight: 700 }}>
                    试用到期(只读)
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 右侧窗口控制 */}
        <div className="topbar-right">
          <div className="window-controls">
            <button
              className="win-btn"
              title="最大化/还原窗口"
              onClick={() => {
                if (typeof window !== 'undefined' && window.legacyLockAPI?.maximizeWindow) {
                  window.legacyLockAPI.maximizeWindow();
                }
              }}
            >
              <ChevronDown style={{ width: 14, height: 14 }} />
            </button>
            <button
              className="win-btn"
              title="最小化窗口"
              onClick={() => {
                if (typeof window !== 'undefined' && window.legacyLockAPI?.minimizeWindow) {
                  window.legacyLockAPI.minimizeWindow();
                }
              }}
            >
              <Minus style={{ width: 14, height: 14 }} />
            </button>
            <button
              className="win-btn close"
              title="关闭应用"
              onClick={() => {
                if (onCloseRequest) {
                  onCloseRequest();
                } else if (typeof window !== 'undefined' && window.legacyLockAPI?.closeWindow) {
                  window.legacyLockAPI.closeWindow();
                }
              }}
            >
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
            onOpenChangePassword={onOpenChangePassword}
            usbPasswordConfig={plan.usbPasswordConfig}
            onEmergencyWipe={onEmergencyWipe}
            onReloadMockData={onReloadMockData}
            onOpenSubscription={onOpenSubscription}
          />
        ) : selectedNav === 'import_export' ? (
          <ImportExportView
            items={items}
            plan={plan}
            drives={drives}
            onImportSuccess={onImportSuccess}
            onRescanDrives={onRescanDrives}
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
              {selectedNav === 'all'
                ? '点击下方按钮即可一键录入账号、密码、密钥或数字资产'
                : `点击下方按钮即可一键录入该分类的${categoryActionTitle}`}
            </p>

            <button
              onClick={() => {
                if (isReadOnly && onOpenSubscription) {
                  onOpenSubscription();
                } else {
                  onAddNew(isDirectCategory ? (selectedNav as VaultCategory) : undefined);
                }
              }}
              className="btn-topbar-add-primary"
              style={{ height: 40, padding: '0 24px', borderRadius: 10, fontSize: 13, gap: 8 }}
              title={
                isReadOnly
                  ? '当前处于试用到期只读模式，点击升级订阅以录入'
                  : selectedNav === 'all'
                  ? '添加新资产或密钥'
                  : `添加${categoryActionTitle}`
              }
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span>{categoryActionTitle}</span>
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
                        title={effectiveReadOnly ? '查阅明文与详情 (只读模式)' : '编辑'}
                      >
                        <Edit style={{ width: 14, height: 14 }} />
                      </button>
                      <button
                        onClick={() => {
                          if (effectiveReadOnly) {
                            if (!canModify && onRequestTakeover) {
                              onRequestTakeover();
                            } else if (onOpenSubscription) {
                              onOpenSubscription();
                            }
                          } else {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="btn-card-action danger"
                        title={effectiveReadOnly ? (!canModify ? '只读模式下无法删除，需接管控制权' : '只读模式下无法删除，点击开通订阅') : '删除'}
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

                    {item.url && (
                      <div className="card-field-row">
                        <span className="card-field-label">网址:</span>
                        <div className="card-field-value-group">
                          <span className="card-field-value font-mono">{item.url}</span>
                          <button
                            onClick={() => handleCopy(item.url!, `url-${item.id}`)}
                            className="btn-mini-copy"
                            title="复制网址"
                          >
                            {copiedId === `url-${item.id}` ? (
                              <Check style={{ width: 12, height: 12, color: '#34D399' }} />
                            ) : (
                              <Copy style={{ width: 12, height: 12 }} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 自定义扩展选项 (自定义标题与内容) */}
                    {item.customFields && item.customFields.length > 0 && (
                      <div className="card-custom-fields-box">
                        {item.customFields.map((cf) => {
                          const fieldKey = `${item.id}-${cf.id}`;
                          const isSecret = cf.isSecret;
                          const isFieldRevealed = revealedCustomFieldIds[fieldKey] || isRevealed;
                          const displayVal = isSecret && !isFieldRevealed ? '••••••••••••' : cf.value;

                          return (
                            <div key={cf.id} className="card-field-row custom">
                              <span className="card-field-label">{cf.name}:</span>
                              <div className="card-field-value-group">
                                <span className={`card-field-value ${cf.type === 'url' || isSecret ? 'font-mono' : ''}`}>
                                  {displayVal || '(空)'}
                                </span>
                                {isSecret && (
                                  <button
                                    onClick={() => toggleCustomFieldReveal(fieldKey)}
                                    className="btn-mini-copy"
                                    title={isFieldRevealed ? '隐藏明文' : '显示明文'}
                                  >
                                    {isFieldRevealed ? (
                                      <EyeOff style={{ width: 12, height: 12 }} />
                                    ) : (
                                      <Eye style={{ width: 12, height: 12 }} />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCopy(cf.value, `cf-${fieldKey}`)}
                                  className="btn-mini-copy"
                                  title={`复制 ${cf.name}`}
                                >
                                  {copiedId === `cf-${fieldKey}` ? (
                                    <Check style={{ width: 12, height: 12, color: '#34D399' }} />
                                  ) : (
                                    <Copy style={{ width: 12, height: 12 }} />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 加密附件展示与一键导出 (Attachments) */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div className="card-attachments-box">
                        <div className="card-attachments-header">
                          <Paperclip style={{ width: 12, height: 12, color: '#00D4FF' }} />
                          <span>加密附件 ({item.attachments.length})</span>
                        </div>
                        {item.attachments.map((att) => (
                          <div key={att.id} className="card-attachment-pill">
                            <div className="card-attachment-name-group">
                              <Paperclip style={{ width: 12, height: 12, color: '#38BDF8', flexShrink: 0 }} />
                              <span className="card-attachment-name" title={att.name}>
                                {att.name}
                              </span>
                              <span className="card-attachment-size">
                                ({formatAttachmentSize(att.size)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="btn-mini-copy"
                              title={`下载/导出附件: ${att.name}`}
                            >
                              <Download style={{ width: 12, height: 12, color: '#00D4FF' }} />
                            </button>
                          </div>
                        ))}
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
