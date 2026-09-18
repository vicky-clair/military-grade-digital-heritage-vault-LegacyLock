import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { RightContentArea } from './components/RightContentArea';
import { CategoryPickerModal } from './components/CategoryPickerModal';
import { ItemModal } from './components/ItemModal';
import { UsbPasswordModal } from './components/UsbPasswordModal';
import { HealthCheckModal } from './components/HealthCheckModal';
import { MediaMigrationModal } from './components/MediaMigrationModal';
import { HeirRecoveryView } from './components/HeirRecoveryView';
import { INITIAL_VAULT_ITEMS } from './services/mockData';
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
} from './services/cryptoService';
import { getTheme, DEFAULT_THEME_ID } from './services/themes';

export const App: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>(() => {
    const saved = localStorage.getItem('legacylock_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return INITIAL_VAULT_ITEMS;
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
  };

  // 当前选中的左侧分类导航：默认选中「external_drive」以 100% 还原用户参考截图！
  const [selectedNav, setSelectedNav] = useState<NavCategoryType>('external_drive');

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

  // 扫描硬件存储驱动器
  const handleRefreshDrives = async () => {
    setIsScanningDrives(true);
    if (isElectronApp() && window.legacyLockAPI) {
      try {
        const res = await window.legacyLockAPI.scanUsbDrives();
        if (res.success && res.drives) {
          setDrives(res.drives);
        }
      } catch (_) {}
    } else {
      setTimeout(() => {
        setDrives([
          {
            name: 'SanDisk Ultra (主U盘)',
            mountPath: 'E:',
            size: 32000000000,
            isRemovable: true,
            hasUserKey: true,
            hasHeirKey: false,
            hasConfig: true,
            hasPasswordProtected: true,
            mediaType: 'UsbFlash',
          },
          {
            name: 'Samsung T7 SSD (副接管盘)',
            mountPath: 'F:',
            size: 1000000000000,
            isRemovable: true,
            hasUserKey: false,
            hasHeirKey: true,
            hasConfig: true,
            hasPasswordProtected: false,
            mediaType: 'UsbSSD',
          },
        ]);
      }, 500);
    }
    setTimeout(() => setIsScanningDrives(false), 600);
  };

  useEffect(() => {
    // 默认不加载驱动器以精确展现参考图里的「掃描外接式硬碟 0」与「未找到資料。」
    // 用户点击重新扫描或有实际硬件时才展现驱动器
  }, []);

  useEffect(() => {
    localStorage.setItem('legacylock_items', JSON.stringify(items));
    encryptVaultWeb(items, plan).then((c) => {
      setContainer(c);
      if (isElectronApp() && window.legacyLockAPI) {
        window.legacyLockAPI.saveVaultContainer(c).catch(() => {});
      }
      runHealthCheck(c, items);
    });
  }, [items, plan]);

  useEffect(() => {
    localStorage.setItem('legacylock_plan', JSON.stringify(plan));
  }, [plan]);

  // 打开添加模态窗：先弹出分类选择面板 (对齐参考图1)
  const handleAddNew = (cat?: VaultCategory) => {
    if (cat) {
      setTargetCategory(cat);
      setEditingItem(null);
      setIsItemModalOpen(true);
    } else {
      setIsCategoryPickerOpen(true);
    }
  };

  const handleSelectCategoryFromPicker = (cat: VaultCategory) => {
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
    if (window.confirm('确定要从数字遗产库中删除该资产项目吗？')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleSaveItem = (item: VaultItem) => {
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
  const handleImportSuccess = (newItems: VaultItem[], isOverwrite: boolean) => {
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
            onExitRecovery={() => setOperatingMode('OWNER')}
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
          />
        </>
      )}

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
        initialItem={editingItem}
        defaultCategory={targetCategory}
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
    </div>
  );
};

export default App;
