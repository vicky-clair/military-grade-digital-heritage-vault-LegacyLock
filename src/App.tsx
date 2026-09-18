import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VaultView } from './components/VaultView';
import { HeritagePlan } from './components/HeritagePlan';
import { UnlockVault } from './components/UnlockVault';
import { ItemModal } from './components/ItemModal';
import { INITIAL_VAULT_ITEMS } from './services/mockData';
import { EncryptedContainer, HeritagePlanConfig, VaultCategory, VaultItem } from './types';
import { encryptVaultWeb, isElectronApp } from './services/cryptoService';

export const App: React.FC = () => {
  const [selectedNav, setSelectedNav] = useState<'all' | VaultCategory | 'plan' | 'unlock'>('all');
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
        '在收到继承生效通知后，请携带本人专用的继承人U盘，前往书房保险箱获取用户U盘，同时插入电脑解锁全部数字资产。',
      expiryDays: 365,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 365 * 86400,
      isConfigured: true,
    };
  });

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

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

  // 统计各分类数量
  const itemCounts = {
    all: items.length,
    login: items.filter((i) => i.category === 'login').length,
    note: items.filter((i) => i.category === 'note').length,
    card: items.filter((i) => i.category === 'card').length,
    license: items.filter((i) => i.category === 'license').length,
    game: items.filter((i) => i.category === 'game').length,
  };

  useEffect(() => {
    localStorage.setItem('legacylock_items', JSON.stringify(items));
    encryptVaultWeb(items, plan).then((c) => {
      setContainer(c);
      if (isElectronApp() && window.legacyLockAPI) {
        window.legacyLockAPI.saveVaultContainer(c).catch(() => {});
      }
    });
  }, [items, plan]);

  useEffect(() => {
    localStorage.setItem('legacylock_plan', JSON.stringify(plan));
  }, [plan]);

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: VaultItem) => {
    setEditingItem(item);
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

  const handleUnlockSuccess = (unlockedItems: VaultItem[]) => {
    setIsUnlocked(true);
    setItems(unlockedItems);
  };

  const handleToggleLock = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
    } else {
      setSelectedNav('unlock');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0E1525] text-[#F8FAFC] overflow-hidden select-none">
      {/* 1Password 左侧边栏 */}
      <Sidebar
        selectedNav={selectedNav}
        onSelectNav={setSelectedNav}
        itemCounts={itemCounts}
        isUnlocked={isUnlocked}
        onAddNew={handleAddItem}
        onToggleLock={handleToggleLock}
      />

      {/* 主视图区域 */}
      <div className="flex-1 flex overflow-hidden">
        {selectedNav === 'plan' ? (
          <HeritagePlan plan={plan} onUpdatePlan={setPlan} />
        ) : selectedNav === 'unlock' ? (
          <UnlockVault
            plan={plan}
            container={container}
            currentItems={items}
            onUnlockSuccess={handleUnlockSuccess}
            isAlreadyUnlocked={isUnlocked}
          />
        ) : (
          <VaultView
            items={items}
            selectedCategory={selectedNav}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            isUnlocked={isUnlocked}
          />
        )}
      </div>

      {/* 1Password 新建/编辑弹窗 */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
      />
    </div>
  );
};

export default App;
