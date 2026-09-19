/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 顶层应用组件与状态编排中心 (App Root Controller)
 * ============================================================================
 * 
 * 核心架构职责：
 * 1. 顶层状态调度：资产数据列表 (items)、继承计划配置 (plan)、主题偏好 (themeId)、运行模式 (OWNER / HEIR_RECOVERY)；
 * 2. 密码学与安全响应：
 *    - 自动将资产列表经 AES-256-GCM 本地加密固化，杜绝明文写入 LevelDB；
 *    - 定期或在资产变动时驱动 6 项健康与完整性自检 (runHealthCheck)；
 *    - 军规级防暂离空闲锁屏监听 (5~60 分钟无操作自动唤起高斯模糊锁屏 LockScreen)；
 * 3. 硬件外部设备感知：
 *    - 启动时自动通过 IPC 扫描物理总线连接的 USB 移动硬盘、闪存盘与 SSD；
 * 4. 模态窗口状态调度：
 *    - 分类选择面板 (CategoryPickerModal)、资产录入表单 (ItemModal)、双钥匙 PIN 配置 (UsbPasswordModal)、
 *      密库健康体检 (HealthCheckModal)、介质无损升级迁移 (MediaMigrationModal)。
 */
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { RightContentArea } from './components/RightContentArea';
import { CategoryPickerModal } from './components/CategoryPickerModal';
import { ItemModal } from './components/ItemModal';
import { UsbPasswordModal } from './components/UsbPasswordModal';
import { HealthCheckModal } from './components/HealthCheckModal';
import { MediaMigrationModal } from './components/MediaMigrationModal';
import { HeirRecoveryView } from './components/HeirRecoveryView';
import { LockScreen } from './components/LockScreen';
import { CloseConfirmModal } from './components/CloseConfirmModal';
import { SetLockPasswordModal } from './components/SetLockPasswordModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { TakeoverControlModal } from './components/TakeoverControlModal';
import { INITIAL_VAULT_ITEMS } from './services/mockData';
import { canModifyVault } from './services/subscriptionService';
import {
  EncryptedContainer,
  HeritagePlanConfig,
  NavCategoryType,
  OperatingMode,
  UsbDrive,
  UsbPasswordConfig,
  VaultCategory,
  VaultHealthReport,
  VaultItem,
} from './types';
import {
  encryptVaultWeb,
  isElectronApp,
  performVaultHealthCheck,
  saveSecureLocalItems,
  loadSecureLocalItems,
} from './services/cryptoService';
import { getTheme, DEFAULT_THEME_ID } from './services/themes';

export const App: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);

  // 军规级防暂离锁屏状态
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const savedPlan = localStorage.getItem('legacylock_plan');
    if (savedPlan) {
      try {
        const p = JSON.parse(savedPlan);
        return Boolean(p.usbPasswordConfig?.hasMasterPassword && p.usbPasswordConfig?.masterPasswordHash);
      } catch (_) {}
    }
    return false;
  });

  const [plan, setPlan] = useState<HeritagePlanConfig>(() => {
    const saved = localStorage.getItem('legacylock_plan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return {
      heirName: '李华 (长子/法定继承人)',
      heirContact: 'lihua_heir@family.org / 138-8888-9999',
      heirNotes:
        '在收到继承生效通知后，请携带专用继承人移动存储介质，前往书房保险箱获取主介质，同时插入电脑解锁全部数字资产。',
      expiryDays: 365,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 365 * 86400,
      isConfigured: true,
    };
  });

  // 渐变主题配色状态
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('legacylock_theme') || DEFAULT_THEME_ID;
  });

  const currentTheme = getTheme(themeId);

  const handleSelectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem('legacylock_theme', id);
    if (isElectronApp() && window.legacyLockAPI?.saveAppSettings) {
      window.legacyLockAPI.saveAppSettings({ theme: id }).catch(() => {});
    }
  };

  // 确保背景颜色实时与持久化主题严格同步
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.background = currentTheme.mainStyle.background;
      document.body.style.background = currentTheme.mainStyle.background;
    }
  }, [currentTheme]);

  // 当前选中的左侧分类导航：默认选中「all (所有密鑰)」展示核心密匙资产
  const [selectedNav, setSelectedNav] = useState<NavCategoryType>('all');

  // 运行模式：所有者模式 (OWNER) vs 继承人只读接管模式 (HEIR_RECOVERY)
  const [operatingMode, setOperatingMode] = useState<OperatingMode>('OWNER');

  // 驱动器扫描状态
  const [isScanningDrives, setIsScanningDrives] = useState(false);
  const [drives, setDrives] = useState<UsbDrive[]>([]);

  // 弹窗状态：分类选择弹窗 (参考图1) + 资产详细表单弹窗
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<VaultCategory>('login');
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  // 用户专门要求的核心功能：U盘密码弹窗
  const [isUsbPasswordModalOpen, setIsUsbPasswordModalOpen] = useState(false);

  // 密库健康自检状态 (Doc v2 规范)
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthReport, setHealthReport] = useState<VaultHealthReport | null>(null);

  // 介质平滑升级与迁移弹窗 (Doc v2 Section 38)
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

  // 关闭应用拦截提示弹窗
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // 锁屏密码弹窗：首次设置与日常修改
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  // 商业订阅与 3 个月试用权益弹窗状态
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionReason, setSubscriptionReason] = useState<'expired_add' | 'expired_edit' | 'expired_delete' | 'manual'>('manual');
  const [canModify, setCanModify] = useState<boolean>(() => canModifyVault());

  // 继承人双 U 盘只读模式控制状态
  const [heirCanModify, setHeirCanModify] = useState<boolean>(true);
  const [showTakeoverModal, setShowTakeoverModal] = useState(false);

  useEffect(() => {
    const handleSubChange = () => {
      setCanModify(canModifyVault());
    };
    window.addEventListener('legacylock:subscription-changed', handleSubChange);
    return () => window.removeEventListener('legacylock:subscription-changed', handleSubChange);
  }, []);

  const [container, setContainer] = useState<EncryptedContainer>({
    version: 1,
    nonce_hex: '00112233445566778899aabb',
    ciphertext_hex: 'aabbccddeeff',
    config: {
      expiry_timestamp: plan.expiryTimestamp,
      server_hash_hex: plan.serverHashHex || '',
      created_at: Math.floor(Date.now() / 1000),
    },
    user_public_hex: plan.userPublicHex || '',
    heir_public_hex: plan.heirPublicHex || '',
  });

  // 执行密库 6 项健康与完整性自检
  const runHealthCheck = async (targetContainer = container, targetItems = items) => {
    setIsCheckingHealth(true);
    try {
      const report = await performVaultHealthCheck(targetContainer, targetItems);
      setHealthReport(report);
    } catch (_) {
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // 扫描硬件存储驱动器 (支持 Windows/macOS/Linux 外部硬盘与 U 盘)
  const handleRefreshDrives = async () => {
    setIsScanningDrives(true);
    if (isElectronApp() && window.legacyLockAPI) {
      try {
        const res = await window.legacyLockAPI.scanUsbDrives();
        if (res.success && res.drives) {
          setDrives(res.drives);
        }
      } catch (err) {
        console.error('[扫描外部驱动器失败]', err);
      }
    } else {
      // 浏览器环境仿真与降级
      setTimeout(() => {
        setDrives([
          {
            name: 'TOSHIBA EXT (D:) - 移动硬盘',
            volumeLabel: 'TOSHIBA EXT',
            driveLetter: 'D:',
            mountPath: 'D:\\',
            size: 2000396832768,
            freeSpace: 151085887488,
            fileSystem: 'NTFS',
            isRemovable: false,
            isExternal: true,
            hasUserKey: false,
            hasHeirKey: false,
            hasConfig: false,
            mediaType: 'UsbHDD',
          },
          {
            name: 'SanDisk Ultra (E:) - U盘',
            volumeLabel: 'SanDisk',
            driveLetter: 'E:',
            mountPath: 'E:\\',
            size: 32000000000,
            freeSpace: 28000000000,
            fileSystem: 'FAT32',
            isRemovable: true,
            isExternal: true,
            hasUserKey: true,
            hasHeirKey: false,
            hasConfig: true,
            hasPasswordProtected: true,
            mediaType: 'UsbFlash',
          },
        ]);
      }, 300);
    }
    setTimeout(() => setIsScanningDrives(false), 500);
  };

  // 启动即刻自动执行：恢复最后保存的主题配色 + 加密加载资产 + 自动识别外部存储介质
  useEffect(() => {
    // 异步加载 AES-256 加密的本地资产
    loadSecureLocalItems()
      .then((loaded) => {
        const hasSeeded = localStorage.getItem('legacylock_seeded') === 'true';
        if (loaded !== null) {
          // 用户已有已保存的资产（可能是已删除干净的空数组 []，或保存的真实资产），严格遵从用户数据
          setItems(loaded);
          if (!hasSeeded) {
            localStorage.setItem('legacylock_seeded', 'true');
          }
        } else if (!hasSeeded) {
          // 全新设备首次启动且从未保存过：导入开箱示例供用户体验探索
          setItems(INITIAL_VAULT_ITEMS);
          localStorage.setItem('legacylock_seeded', 'true');
          saveSecureLocalItems(INITIAL_VAULT_ITEMS).catch(() => {});
        } else {
          // 之前已初始化过但返回 null（如被清空），保持空状态
          setItems([]);
        }
        setIsStorageLoaded(true);
      })
      .catch((err) => {
        console.error('[加载本地加密资产失败]', err);
        setIsStorageLoaded(true);
      });

    if (isElectronApp() && window.legacyLockAPI?.getAppSettings) {
      window.legacyLockAPI.getAppSettings().then((res) => {
        if (res.success && res.settings) {
          if (res.settings.theme) {
            setThemeId(res.settings.theme);
            localStorage.setItem('legacylock_theme', res.settings.theme);
          }
          if (res.settings.closeAction) {
            localStorage.setItem('legacylock_close_action', res.settings.closeAction);
          }
        }
      }).catch(() => {});
    }
    handleRefreshDrives();
  }, []);

  // 军规级防暂离空闲自动锁屏监听
  useEffect(() => {
    let timeoutId: any = null;

    const resetIdleTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      const autoLockMin = Number(localStorage.getItem('legacylock_autolock') || '15');
      if (autoLockMin > 0 && !isLocked) {
        timeoutId = setTimeout(() => {
          setIsLocked(true);
        }, autoLockMin * 60 * 1000);
      }
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [isLocked]);

  useEffect(() => {
    // 关键生命周期守卫：在存储尚未完成加载时，绝对禁止自动回写覆盖用户数据！
    if (!isStorageLoaded) return;

    saveSecureLocalItems(items);
    encryptVaultWeb(items, plan).then((c) => {
      setContainer(c);
      if (isElectronApp() && window.legacyLockAPI) {
        window.legacyLockAPI.saveVaultContainer(c).catch(() => {});
      }
      runHealthCheck(c, items);
    });
  }, [items, plan, isStorageLoaded]);

  useEffect(() => {
    localStorage.setItem('legacylock_plan', JSON.stringify(plan));
  }, [plan]);

  // 打开添加模态窗：先弹出分类选择面板 (对齐参考图1)
  const handleAddNew = (cat?: VaultCategory) => {
    if (!heirCanModify) {
      setShowTakeoverModal(true);
      return;
    }
    if (!canModifyVault()) {
      setSubscriptionReason('expired_add');
      setIsSubscriptionModalOpen(true);
      return;
    }
    if (cat) {
      setTargetCategory(cat);
      setEditingItem(null);
      setIsItemModalOpen(true);
    } else {
      setIsCategoryPickerOpen(true);
    }
  };

  const handleSelectCategoryFromPicker = (cat: VaultCategory) => {
    if (!heirCanModify) {
      setIsCategoryPickerOpen(false);
      setShowTakeoverModal(true);
      return;
    }
    if (!canModifyVault()) {
      setIsCategoryPickerOpen(false);
      setSubscriptionReason('expired_add');
      setIsSubscriptionModalOpen(true);
      return;
    }
    setTargetCategory(cat);
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: VaultItem) => {
    setEditingItem(item);
    setTargetCategory(item.category);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (!heirCanModify) {
      setShowTakeoverModal(true);
      return;
    }
    if (!canModifyVault()) {
      setSubscriptionReason('expired_delete');
      setIsSubscriptionModalOpen(true);
      return;
    }
    if (window.confirm('确定要从数字遗产库中删除该资产项目吗？')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleSaveItem = (item: VaultItem) => {
    if (!heirCanModify) {
      setShowTakeoverModal(true);
      return;
    }
    if (!canModifyVault()) {
      setSubscriptionReason('expired_edit');
      setIsSubscriptionModalOpen(true);
      return;
    }
    if (editingItem) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    } else {
      setItems((prev) => [item, ...prev]);
    }
  };

  // 保存 U 盘密码配置
  const handleSaveUsbPassword = async (config: UsbPasswordConfig, targetDrive: string) => {
    const updatedPlan: HeritagePlanConfig = {
      ...plan,
      usbPasswordConfig: config,
    };
    setPlan(updatedPlan);
    localStorage.setItem('legacylock_plan', JSON.stringify(updatedPlan));

    // 标记介质已受密码保护
    setDrives((prev) =>
      prev.map((d) =>
        d.mountPath === targetDrive ? { ...d, hasPasswordProtected: true } : d
      )
    );
  };

  // 请求关闭主窗口 (检查用户保存的默认行为：每次询问 / 最小化到托盘 / 直接退出)
  const handleCloseRequest = () => {
    const savedAction = localStorage.getItem('legacylock_close_action') || 'ask';
    if (savedAction === 'minimize_to_tray') {
      const shouldLock = localStorage.getItem('legacylock_lock_on_tray') !== 'false';
      if (shouldLock) {
        setIsLocked(true);
      }
      if (isElectronApp() && window.legacyLockAPI?.minimizeToTray) {
        window.legacyLockAPI.minimizeToTray();
      }
    } else if (savedAction === 'quit') {
      if (isElectronApp() && window.legacyLockAPI?.quitApp) {
        window.legacyLockAPI.quitApp();
      } else {
        window.close();
      }
    } else {
      setIsCloseModalOpen(true);
    }
  };

  // 确认关闭弹窗提交
  const handleConfirmClose = (action: 'minimize_to_tray' | 'quit', remember: boolean) => {
    if (remember) {
      localStorage.setItem('legacylock_close_action', action);
      if (isElectronApp() && window.legacyLockAPI?.saveAppSettings) {
        window.legacyLockAPI.saveAppSettings({ closeAction: action }).catch(() => {});
      }
    }
    setIsCloseModalOpen(false);
    if (action === 'minimize_to_tray') {
      const shouldLock = localStorage.getItem('legacylock_lock_on_tray') !== 'false';
      if (shouldLock) {
        setIsLocked(true);
      }
      if (isElectronApp() && window.legacyLockAPI?.minimizeToTray) {
        window.legacyLockAPI.minimizeToTray();
      }
    } else {
      if (isElectronApp() && window.legacyLockAPI?.quitApp) {
        window.legacyLockAPI.quitApp();
      } else {
        window.close();
      }
    }
  };

  // 锁屏请求处理：直接锁定；若需初始化或修改密码在系统设置中进行即可
  const handleRequestLock = () => {
    setIsLocked(true);
  };

  // 首次设置锁屏密码成功：保存配置（包含军规级 Secret Key）并立即锁屏
  const handleSaveInitialLockPassword = (
    hashHex: string,
    saltHex: string,
    hint: string,
    secretKey?: string,
    secretKeyHash?: string
  ) => {
    const updatedConfig: UsbPasswordConfig = {
      ...(plan.usbPasswordConfig || {
        hasHeirPassword: false,
        autoLockMinutes: 15,
        isHardwareEncrypted: true,
      }),
      hasMasterPassword: true,
      masterPasswordHash: hashHex,
      masterPasswordSalt: saltHex,
      masterPasswordHint: hint,
      hasSecretKey: Boolean(secretKey),
      secretKey: secretKey,
      secretKeyHash: secretKeyHash,
      secretKeyCreatedAt: secretKey ? Date.now() : undefined,
      lastChangedAt: Date.now(),
    };
    const updatedPlan: HeritagePlanConfig = {
      ...plan,
      usbPasswordConfig: updatedConfig,
    };
    setPlan(updatedPlan);
    localStorage.setItem('legacylock_plan', JSON.stringify(updatedPlan));
    setIsSetPasswordModalOpen(false);
    setIsLocked(true);
  };

  // 在系统设置中修改/重置锁屏主密码
  const handleChangeLockPassword = (newHashHex: string, newSaltHex: string, newHint: string) => {
    const updatedConfig: UsbPasswordConfig = {
      ...(plan.usbPasswordConfig || {
        hasHeirPassword: false,
        autoLockMinutes: 15,
        isHardwareEncrypted: true,
      }),
      hasMasterPassword: true,
      masterPasswordHash: newHashHex,
      masterPasswordSalt: newSaltHex,
      masterPasswordHint: newHint,
      lastChangedAt: Date.now(),
    };
    const updatedPlan: HeritagePlanConfig = {
      ...plan,
      usbPasswordConfig: updatedConfig,
    };
    setPlan(updatedPlan);
    localStorage.setItem('legacylock_plan', JSON.stringify(updatedPlan));
    setIsChangePasswordModalOpen(false);
    alert('✅ 锁屏主密码已成功更新！');
  };

  // 监听桌面端托盘与主进程事件 (关闭拦截与托盘一键锁库)
  useEffect(() => {
    if (isElectronApp() && window.legacyLockAPI) {
      if (window.legacyLockAPI.onRequestClose) {
        window.legacyLockAPI.onRequestClose(() => {
          handleCloseRequest();
        });
      }
      if (window.legacyLockAPI.onLockVault) {
        window.legacyLockAPI.onLockVault(() => {
          handleRequestLock();
        });
      }
    }
  }, [plan]);

  // 儲存按钮：同步至主盘或导出密包
  const handleSaveToDrive = async () => {
    if (isElectronApp() && window.legacyLockAPI) {
      try {
        await window.legacyLockAPI.saveVaultContainer(container);
        alert('✅ 核心数字遗产库已加密封装并成功同步写入目标移动介质！');
      } catch (err: any) {
        alert(`❌ 写入异常: ${err.message}`);
      }
    } else {
      const blob = new Blob([JSON.stringify(container, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LegacyLock_LVCF2_Vault_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('✅ 军规加密密包已生成并下载至本地！');
    }
  };

  // 處理加密導入恢復完成
  const handleImportSuccess = (newItems: VaultItem[], isOverwrite: boolean, isReadOnly?: boolean) => {
    if (isReadOnly) {
      setOperatingMode('HEIR_RECOVERY');
      setHeirCanModify(false);
    }
    if (isOverwrite) {
      setItems(newItems);
    } else {
      // 增量合併：依據 id 去重
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const added = newItems.filter((i) => !existingIds.has(i.id));
        return [...added, ...prev];
      });
    }
  };

  // 複製按钮：一键复制当前密匙列表
  const handleCopyAll = () => {
    const text = items
      .map(
        (i, idx) =>
          `[${idx + 1}] ${i.title} (${i.category}) | 账号: ${i.username || '无'} | 密码: ${i.password || '无'}`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('📋 当前密匙清单已成功复制到系统剪贴板！');
  };

  // 军规级安全紧急销毁
  const handleEmergencyWipe = () => {
    if (!heirCanModify) {
      alert('🔒 当前处于继承人只读模式，无权执行数据销毁。请先输入主密码与安全密钥接管控制权。');
      return;
    }
    localStorage.removeItem('legacylock_items_enc');
    localStorage.removeItem('legacylock_items');
    localStorage.removeItem('legacylock_plan');
    localStorage.removeItem('legacylock_seeded');
    setItems([]);
    alert('⚠️ 军规级安全擦除完成！本地缓存与数字遗产密库已彻底清空。');
  };

  // 重新导入官方开箱示例
  const handleReloadMockData = () => {
    if (window.confirm('确定要将官方演示示例资产重新导入密库吗？已录入的资产不会丢失。')) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const toAdd = INITIAL_VAULT_ITEMS.filter((i) => !existingIds.has(i.id));
        return [...prev, ...toAdd];
      });
      localStorage.setItem('legacylock_seeded', 'true');
      alert('✅ 官方演示示例资产已成功重新导入！');
    }
  };

  // 计算各分类数量
  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className="app-shell"
      style={{ background: currentTheme.mainStyle.background }}
    >
      {operatingMode === 'HEIR_RECOVERY' ? (
        /* 继承人只读接管模式视图 (严格单向只读) */
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <HeirRecoveryView
            items={items}
            heirName={plan.heirName || '法定继承人'}
            vaultId={healthReport?.vaultId || 'LVCF-2026-X892'}
            onExitRecovery={() => {
              setOperatingMode('OWNER');
              setHeirCanModify(true);
              setIsLocked(true);
            }}
            canModify={heirCanModify}
            onRequestTakeover={() => setShowTakeoverModal(true)}
          />
        </main>
      ) : (
        /* 核心所有者模式：左边显示各种分类功能，右面显示已添加内容（完全对齐用户参考截图） */
        <>
          {/* 左侧边栏导航 */}
          <Sidebar
            selectedNav={selectedNav}
            onSelectNav={setSelectedNav}
            categoryCounts={categoryCounts}
            totalCount={items.length}
            detectedDrivesCount={drives.length}
            onAddNew={() => handleAddNew()}
            theme={currentTheme}
          />

          {/* 右侧主工作内容区 */}
          <RightContentArea
            selectedNav={selectedNav}
            items={items}
            drives={drives}
            plan={plan}
            isReadOnly={!canModify}
            onOpenSubscription={() => {
              setSubscriptionReason('manual');
              setIsSubscriptionModalOpen(true);
            }}
            onAddNew={handleAddNew}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onOpenUsbPassword={() => setIsUsbPasswordModalOpen(true)}
            onSaveToDrive={handleSaveToDrive}
            onCopyAll={handleCopyAll}
            onImportSuccess={handleImportSuccess}
            onRescanDrives={handleRefreshDrives}
            isScanningDrives={isScanningDrives}
            onOpenHealthCheck={() => {
              runHealthCheck();
              setIsHealthCheckOpen(true);
            }}
            onOpenMigration={() => setIsMigrationOpen(true)}
            onSwitchToHeirMode={() => setOperatingMode('HEIR_RECOVERY')}
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
            onEmergencyWipe={handleEmergencyWipe}
            onLock={handleRequestLock}
            onCloseRequest={handleCloseRequest}
            onOpenChangePassword={() => {
              const hasConfiguredMaster = Boolean(
                plan.usbPasswordConfig?.hasMasterPassword &&
                plan.usbPasswordConfig?.masterPasswordHash &&
                plan.usbPasswordConfig?.masterPasswordSalt
              );
              if (hasConfiguredMaster) {
                setIsChangePasswordModalOpen(true);
              } else {
                setIsSetPasswordModalOpen(true);
              }
            }}
            onReloadMockData={handleReloadMockData}
            canModify={heirCanModify}
            onRequestTakeover={() => setShowTakeoverModal(true)}
          />
        </>
      )}

      {/* 军规级防暂离锁屏全屏遮罩 */}
      <LockScreen
        isOpen={isLocked}
        config={plan.usbPasswordConfig}
        onUnlock={() => setIsLocked(false)}
        onEmergencyWipe={handleEmergencyWipe}
        drives={drives}
        onHeirReadOnlyUnlock={() => {
          setOperatingMode('HEIR_RECOVERY');
          setHeirCanModify(false);
          setIsLocked(false);
        }}
        onRescanDrives={handleRefreshDrives}
      />

      {/* 关闭应用拦截提示弹窗 (支持最小化到托盘/彻底退出与记住选择) */}
      <CloseConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleConfirmClose}
      />

      {/* 首次使用设置锁屏密码弹窗 */}
      <SetLockPasswordModal
        isOpen={isSetPasswordModalOpen}
        onClose={() => setIsSetPasswordModalOpen(false)}
        onSuccess={handleSaveInitialLockPassword}
      />

      {/* 系统设置修改锁屏主密码弹窗 */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        config={plan.usbPasswordConfig}
        onSuccess={handleChangeLockPassword}
      />

      {/* 分类选择弹窗（严格对齐用户参考图 1: 你想要添加什么？） */}
      <CategoryPickerModal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        onSelectCategory={handleSelectCategoryFromPicker}
      />

      {/* 资产表单详细填写弹窗 */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        initialItem={editingItem}
        defaultCategory={targetCategory}
        isReadOnly={!canModify || !heirCanModify}
        isHeirReadOnly={!heirCanModify}
        onRequestTakeover={() => {
          setIsItemModalOpen(false);
          setShowTakeoverModal(true);
        }}
        onUpgrade={() => {
          setIsItemModalOpen(false);
          if (!heirCanModify) {
            setShowTakeoverModal(true);
          } else {
            setSubscriptionReason('expired_edit');
            setIsSubscriptionModalOpen(true);
          }
        }}
      />

      {/* 用户专门要求的核心功能：U盘密码与硬件保护弹窗 */}
      <UsbPasswordModal
        isOpen={isUsbPasswordModalOpen}
        onClose={() => setIsUsbPasswordModalOpen(false)}
        drives={drives}
        config={plan.usbPasswordConfig}
        onSaveConfig={handleSaveUsbPassword}
      />

      {/* 密库 6 项健康与密码学自检弹窗 (Doc v2 规范) */}
      <HealthCheckModal
        isOpen={isHealthCheckOpen}
        onClose={() => setIsHealthCheckOpen(false)}
        report={healthReport}
        onRecheck={runHealthCheck}
        isChecking={isCheckingHealth}
      />

      {/* 存储介质平滑迁移升级弹窗 (Doc v2 Section 38: U盘到移动固态硬盘/机械硬盘) */}
      <MediaMigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        drives={drives}
        onMigrateSuccess={(target) => {
          setIsMigrationOpen(false);
          alert(`✅ 介质平滑迁移完成！已将所有权与数据安全迁移至目标介质: ${target}`);
        }}
      />

      {/* 商业订阅与 3 个月试用权益管理弹窗 */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        reason={subscriptionReason}
      />

      {/* 继承人接管控制权认证弹窗 (主密码 + 128位紧急安全密钥) */}
      <TakeoverControlModal
        isOpen={showTakeoverModal}
        onClose={() => setShowTakeoverModal(false)}
        passwordConfig={plan.usbPasswordConfig}
        onSuccess={() => {
          setHeirCanModify(true);
          setOperatingMode('OWNER');
          setShowTakeoverModal(false);
          alert('✅ 接管控制权成功！已切换至所有者完全读写模式。');
        }}
      />
    </div>
  );
};

export default App;
