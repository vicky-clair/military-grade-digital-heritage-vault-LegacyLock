import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VaultView } from './components/VaultView';
import { HeritagePlan } from './components/HeritagePlan';
import { UnlockVault } from './components/UnlockVault';
import { ItemModal } from './components/ItemModal';
import { INITIAL_VAULT_ITEMS } from './services/mockData';
import { EncryptedContainer, HeritagePlanConfig, VaultItem } from './types';
import { encryptVaultWeb, isElectronApp } from './services/cryptoService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vault' | 'plan' | 'unlock'>('vault');
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
        '在收到继承生效通知后，请携带本人专用的继承人U盘，前往书房保险柜获取用户U盘，同时插入电脑解锁全部数字资产。',
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

  // 状态持久化与自动更新密文容器
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
    if (window.confirm('确定要从数字遗产库中删除该资产凭证吗？')) {
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

  return (
    <div className="min-h-screen bg-[#061524] text-slate-100 flex flex-col selection:bg-[#00D4FF]/30 selection:text-white">
      {/* 顶部导航 */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUnlocked={isUnlocked}
        itemCount={items.length}
      />

      {/* 主视图区域 */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'vault' && (
          <VaultView
            items={items}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            isUnlocked={isUnlocked}
          />
        )}

        {activeTab === 'plan' && (
          <HeritagePlan plan={plan} onUpdatePlan={setPlan} />
        )}

        {activeTab === 'unlock' && (
          <UnlockVault
            plan={plan}
            container={container}
            currentItems={items}
            onUnlockSuccess={handleUnlockSuccess}
            isAlreadyUnlocked={isUnlocked}
          />
        )}
      </div>

      {/* 资产凭据新建/编辑弹窗 */}
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
