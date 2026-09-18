import React, { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Lock,
  Star,
  Plus,
} from 'lucide-react';
import { VaultCategory, VaultItem } from '../types';
import { getCategoryDef } from '../services/categories';

interface VaultViewProps {
  items: VaultItem[];
  selectedCategory: 'all' | VaultCategory;
  onAddItem: () => void;
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (id: string) => void;
  isUnlocked: boolean;
}

export const VaultView: React.FC<VaultViewProps> = ({
  items,
  selectedCategory,
  onAddItem,
  onEditItem,
  onDeleteItem,
  isUnlocked,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.length > 0 ? items[0].id : null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    'item-steam-1': true,
    'item-bank-safe-2': true,
  });

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username && item.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedItem =
    items.find((i) => i.id === selectedItemId) || filteredItems[0] || null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSecretReveal = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentCategoryTitle =
    selectedCategory === 'all' ? '全部项目' : getCategoryDef(selectedCategory).name;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0C101C] select-none text-slate-200">
      {/* 中间栏：资产列表 */}
      <div className="w-80 sm:w-96 border-r border-white/5 flex flex-col h-full bg-[#0E1322] flex-shrink-0">
        {/* 顶部搜索与添加操作 */}
        <div className="p-3.5 border-b border-white/5 space-y-3 bg-[#0B0F1D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {currentCategoryTitle}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                {filteredItems.length}
              </span>
            </div>

            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0572EC] hover:bg-[#1882FB] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建</span>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目名称、账号或备注..."
              className="w-full pl-9 pr-4 py-2 bg-[#171C2E] border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0572EC] transition-colors"
            />
          </div>
        </div>

        {/* 资产项滚动列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scroll">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const def = getCategoryDef(item.category);
              const ItemIcon = def.icon;
              const isSelected = selectedItem?.id === item.id;
              const isFav = favorites[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#182035] border-l-4 border-l-[#0572EC]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* 分类图标 */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: def.bgColor }}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </div>

                  {/* 标题与摘要 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className={`p-1 rounded transition-colors ${
                          isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                      {item.username || item.url || def.name}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-sans">
                        {def.name}
                      </span>
                      {item.customFields && item.customFields.length > 0 && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          +{item.customFields.length} 项属性
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 mx-auto flex items-center justify-center">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs">未找到匹配的数字遗产项目</p>
              <button
                onClick={onAddItem}
                className="text-xs text-[#00D4FF] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>立即新建该项</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 右侧栏：资产详情视窗 */}
      <div className="flex-1 flex flex-col h-full bg-[#0A0E1A] overflow-hidden">
        {selectedItem ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* 详情头部 */}
            {(() => {
              const def = getCategoryDef(selectedItem.category);
              const ItemIcon = def.icon;

              return (
                <div className="p-6 border-b border-white/5 bg-[#0D1222] flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
                      style={{ backgroundColor: def.bgColor }}
                    >
                      <ItemIcon className="w-7 h-7" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-white truncate">
                          {selectedItem.title}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-white/5 text-slate-300">
                          {def.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          更新于 {new Date(selectedItem.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {isUnlocked ? '已通过双钥匙认证' : '军规加密保护中'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 快捷操作栏 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditItem(selectedItem)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                      title="编辑此项目"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>编辑</span>
                    </button>

                    <button
                      onClick={() => onDeleteItem(selectedItem.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="从保险库删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 详情内容滚动区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll max-w-4xl">
              {/* 核心凭证卡片 */}
              {(selectedItem.username || selectedItem.password || selectedItem.url) && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    核心认证信息
                  </h4>

                  <div className="bg-[#121727] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {/* 用户名 */}
                    {selectedItem.username && (
                      <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02]">
                        <div>
                          <p className="text-[11px] font-mono text-slate-400 mb-0.5">
                            用户名 / 识别号
                          </p>
                          <p className="text-sm font-semibold text-white font-mono">
                            {selectedItem.username}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(selectedItem.username!, 'username')}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="复制用户名"
                        >
                          {copiedKey === 'username' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* 密码 */}
                    {selectedItem.password && (
                      <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02]">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[11px] font-mono text-slate-400 mb-0.5">
                            密码 / 密钥口令
                          </p>
                          <p className="text-sm font-mono text-white tracking-wider truncate">
                            {revealedSecrets['pwd']
                              ? selectedItem.password
                              : '••••••••••••••••••••'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => toggleSecretReveal('pwd')}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            title={revealedSecrets['pwd'] ? '隐藏口令' : '显示口令'}
                          >
                            {revealedSecrets['pwd'] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(selectedItem.password!, 'password')}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="复制密码"
                          >
                            {copiedKey === 'password' ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 关联网址 */}
                    {selectedItem.url && (
                      <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02]">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-[11px] font-mono text-slate-400 mb-0.5">
                            关联网络端点 / 网站
                          </p>
                          <a
                            href={selectedItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#00D4FF] hover:underline truncate block"
                          >
                            {selectedItem.url}
                          </a>
                        </div>
                        <a
                          href={selectedItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="在浏览器中打开"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 模板特有字段与自定义字段 */}
              {selectedItem.customFields && selectedItem.customFields.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    资产专属属性 ({selectedItem.customFields.length})
                  </h4>

                  <div className="bg-[#121727] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                    {selectedItem.customFields.map((field) => {
                      const isSecret = field.isSecret;
                      const isRevealed = revealedSecrets[field.id];

                      return (
                        <div
                          key={field.id}
                          className="p-4 flex items-center justify-between group hover:bg-white/[0.02]"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[11px] font-mono text-slate-400 mb-0.5">
                              {field.name}
                            </p>
                            <p className="text-sm font-mono text-white break-all">
                              {isSecret && !isRevealed ? '••••••••••••••••••••' : field.value}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isSecret && (
                              <button
                                onClick={() => toggleSecretReveal(field.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(field.value, field.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                              title="复制属性值"
                            >
                              {copiedKey === field.id ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 安全备注与继承人说明 */}
              {selectedItem.notes && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    安全备注与继承指示
                  </h4>
                  <div className="p-4 bg-[#121727] border border-white/5 rounded-2xl">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-400/60" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                选择项目以查看完整加密资产
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                所有数据均采用军规级 X25519 密钥交换与 AES-256-GCM 本地离线密文封装
              </p>
            </div>
            <button
              onClick={onAddItem}
              className="px-4 py-2 bg-[#0572EC] hover:bg-[#1882FB] text-white rounded-xl text-xs font-semibold shadow-md inline-flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>添加新项目</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
