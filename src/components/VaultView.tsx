import React, { useState } from 'react';
import {
  Search,
  KeyRound,
  FileText,
  CreditCard,
  Award,
  Gamepad2,
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
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
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

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryIcon = (cat: VaultCategory) => {
    switch (cat) {
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'login':
        return <KeyRound className="w-4 h-4 text-cyan-400" />;
      case 'note':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'license':
        return <Award className="w-4 h-4 text-rose-400" />;
      default:
        return <Lock className="w-4 h-4 text-blue-400" />;
    }
  };

  const getCategoryTitle = (cat: 'all' | VaultCategory) => {
    switch (cat) {
      case 'all':
        return '全部项目';
      case 'login':
        return '登录信息';
      case 'game':
        return '游戏数字遗产';
      case 'note':
        return '安全便签 / 遗嘱';
      case 'card':
        return '信用卡与离岸财务';
      case 'license':
        return '软件授权与许可';
      default:
        return '保险库项目';
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#0E1525]">
      {/* 中间列：1Password 风格条目列表 (340px) */}
      <section className="w-80 md:w-96 border-r border-white/5 bg-[#121A2B] flex flex-col flex-shrink-0">
        {/* 顶部搜索栏与快捷键提示 */}
        <div className="p-3 border-b border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {getCategoryTitle(selectedCategory)}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {filteredItems.length} 个项目
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索或输入 Ctrl+K..."
              className="op-input pl-9 pr-12 text-xs py-1.5"
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono px-1 py-0.5 rounded bg-white/5 border border-white/10">
              Ctrl K
            </span>
          </div>
        </div>

        {/* 条目列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 space-y-2">
              <Lock className="w-8 h-8 text-slate-700 mx-auto" />
              <p>暂无符合搜索条件的数字遗产项目</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isFav = favorites[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`px-3.5 py-3 cursor-pointer transition-all flex items-start justify-between gap-2.5 group relative ${
                    isSelected
                      ? 'bg-[#1C283F] border-l-2 border-l-[#0572EC]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-[#0E1626] border-[#0572EC]/40 shadow-sm'
                          : 'bg-[#161F30] border-white/5'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold text-white truncate max-w-[190px]">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[190px] font-mono mt-0.5">
                        {item.username || '加密机密备忘录'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`p-1 rounded text-slate-400 hover:text-amber-400 transition-colors ${
                        isFav ? 'text-amber-400 opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 列表底部快捷添加 */}
        <div className="p-3 border-t border-white/5 bg-[#0D1424]">
          <button
            onClick={onAddItem}
            className="op-btn-primary w-full text-xs py-2"
          >
            <Plus className="w-4 h-4" />
            <span>新建数字遗产项目</span>
          </button>
        </div>
      </section>

      {/* 右侧列：1Password 风格详情面板 (Spacious Detail View) */}
      <main className="flex-1 overflow-y-auto bg-[#0E1525] flex flex-col">
        {selectedItem ? (
          <div className="flex-1 flex flex-col">
            {/* 详情页顶部操作工具栏 */}
            <header className="px-8 py-3.5 border-b border-white/5 bg-[#0E1525]/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="op-badge op-badge-blue">
                  {getCategoryTitle(selectedItem.category)}
                </span>
                {isUnlocked && (
                  <span className="op-badge op-badge-green">
                    <ShieldCheck className="w-3 h-3" />
                    已通过双U盘解密
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedItem.password && (
                  <button
                    onClick={() =>
                      handleCopy(selectedItem.password!, 'top-pass')
                    }
                    className="op-btn-secondary text-xs"
                    title="复制密码"
                  >
                    {copiedKey === 'top-pass' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>已复制密码</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>复制密码</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => onEditItem(selectedItem)}
                  className="op-btn-secondary text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>编辑</span>
                </button>

                <button
                  onClick={() => onDeleteItem(selectedItem.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="删除项目"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* 详情内容容器 */}
            <div className="p-8 max-w-3xl space-y-6">
              {/* 大图标与标题横幅 */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C283F] to-[#121A2B] border border-white/10 flex items-center justify-center p-1 shadow-lg shadow-black/40">
                  <div className="w-full h-full bg-[#0E1525] rounded-xl flex items-center justify-center">
                    {getCategoryIcon(selectedItem.category)}
                  </div>
                </div>

                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {selectedItem.title}
                  </h1>
                  <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    最后修改于: {new Date(selectedItem.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* 1Password 风格分组卡片：LOGIN DETAILS */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  认证凭证详情 (LOGIN DETAILS)
                </h3>

                <div className="op-field-group">
                  {selectedItem.username && (
                    <div className="op-field-row">
                      <div className="min-w-0 pr-4">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          用户名 / 账号
                        </span>
                        <span className="text-xs font-mono text-white font-medium select-text">
                          {selectedItem.username}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(selectedItem.username!, 'user-row')
                        }
                        className="op-btn-ghost text-xs"
                      >
                        {copiedKey === 'user-row' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>复制</span>
                      </button>
                    </div>
                  )}

                  {selectedItem.password && (
                    <div className="p-3.5 border-b border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-4">
                          <span className="text-[10px] font-mono text-slate-400 block">
                            主密码 (AES-256-GCM 密文保护)
                          </span>
                          <span className="text-sm font-mono text-white font-semibold tracking-wider select-text">
                            {revealedPasswords[selectedItem.id]
                              ? selectedItem.password
                              : '••••••••••••••••••••'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              togglePasswordReveal(selectedItem.id)
                            }
                            className="op-btn-ghost text-xs"
                          >
                            {revealedPasswords[selectedItem.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleCopy(selectedItem.password!, 'pass-row')
                            }
                            className="op-btn-ghost text-xs"
                          >
                            {copiedKey === 'pass-row' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>复制</span>
                          </button>
                        </div>
                      </div>

                      {/* 1Password 密码强度条 */}
                      <div className="space-y-1.5 pt-1">
                        <div className="op-strength-bar">
                          <div className="op-strength-fill w-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            军规级高强度保护 (Argon2id + AES-GCM)
                          </span>
                          <span>破解预计耗时: 超 10 亿年</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedItem.url && (
                    <div className="op-field-row">
                      <div className="min-w-0 pr-4">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          关联网站 / 服务地址
                        </span>
                        <a
                          href={selectedItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#0572EC] hover:underline font-mono truncate block"
                        >
                          {selectedItem.url}
                        </a>
                      </div>
                      <a
                        href={selectedItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="op-btn-ghost text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 1Password 风格分组卡片：HERITAGE INSTRUCTIONS */}
              {selectedItem.notes && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 px-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    继承人嘱托与离世解密指南 (HERITAGE INSTRUCTIONS)
                  </h3>

                  <div className="p-4 rounded-xl bg-[#161F30] border border-amber-500/20 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text shadow-sm">
                    {selectedItem.notes}
                  </div>
                </div>
              )}

              {/* 1Password 风格自定义字段 */}
              {selectedItem.customFields && selectedItem.customFields.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    更多敏感凭据字段 (ADDITIONAL FIELDS)
                  </h3>

                  <div className="op-field-group">
                    {selectedItem.customFields.map((field) => (
                      <div key={field.id} className="op-field-row">
                        <div className="min-w-0 pr-4">
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {field.name}
                          </span>
                          <span className="text-xs font-mono text-white select-text">
                            {field.isSecret && !revealedPasswords[field.id]
                              ? '••••••••••••'
                              : field.value}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {field.isSecret && (
                            <button
                              onClick={() => togglePasswordReveal(field.id)}
                              className="op-btn-ghost text-xs"
                            >
                              {revealedPasswords[field.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(field.value, field.id)}
                            className="op-btn-ghost text-xs"
                          >
                            {copiedKey === field.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>复制</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1Password 底部项目信息 */}
              <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>项目唯一识别码: {selectedItem.id}</span>
                <span>创建于: {new Date(selectedItem.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#161F30] border border-white/5 flex items-center justify-center">
              <Lock className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-sm font-medium">请从左侧选择一个数字遗产项目</p>
            <p className="text-xs text-slate-400">
              或者点击左下角「新建数字遗产项目」添加新的资产凭证
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
