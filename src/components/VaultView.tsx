import React, { useState } from 'react';
import {
  Search,
  Plus,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Gamepad2,
  KeyRound,
  FileText,
  CreditCard,
  Award,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { VaultCategory, VaultItem } from '../types';

interface VaultViewProps {
  items: VaultItem[];
  onAddItem: () => void;
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (id: string) => void;
  isUnlocked: boolean;
}

export const VaultView: React.FC<VaultViewProps> = ({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  isUnlocked,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VaultCategory | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.length > 0 ? items[0].id : null
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.username && item.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const selectedItem = items.find((i) => i.id === selectedItemId) || filteredItems[0];

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCategoryIcon = (cat: VaultCategory) => {
    switch (cat) {
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'login':
        return <KeyRound className="w-4 h-4 text-blue-400" />;
      case 'note':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'license':
        return <Award className="w-4 h-4 text-cyan-400" />;
      default:
        return <Lock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryLabel = (cat: VaultCategory) => {
    switch (cat) {
      case 'game':
        return '游戏资产';
      case 'login':
        return '登录凭据';
      case 'note':
        return '安全备忘';
      case 'card':
        return '支付卡片';
      case 'license':
        return '软件授权';
      case 'identity':
        return '身份凭据';
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* 边栏分类导航 */}
      <aside className="w-full md:w-60 border-r border-[#1F2937] bg-[#061524]/60 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            资产分类
          </span>
          <span className="text-xs font-mono text-[#00D4FF] bg-[#0A2540] px-2 py-0.5 rounded-full border border-[#00D4FF]/20">
            {items.length} 份资产
          </span>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>全部数字遗产</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {items.length}
            </span>
          </button>

          {(['login', 'game', 'note', 'card', 'license'] as VaultCategory[]).map((cat) => {
            const count = items.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat)}
                  <span>{getCategoryLabel(cat)}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 军规安全提示盒 */}
        <div className="mt-auto p-3 rounded-xl bg-[#0A1C30] border border-[#1F2937] text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>端到端离线加密</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isUnlocked ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
              {isUnlocked ? '继承已激活' : '完全闭锁'}
            </span>
          </div>
          <p>
            数字资产采用 AES-256-GCM 封装，未插入双U盘时，任何第三方均无法反编译或解密。
          </p>
        </div>
      </aside>

      {/* 资产列表栏 */}
      <section className="w-full md:w-80 border-r border-[#1F2937] flex flex-col bg-[#0A192F]/40">
        {/* 搜索与添加 */}
        <div className="p-3 border-b border-[#1F2937] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索数字资产或标签..."
              className="vault-input pl-9 text-xs py-2"
            />
          </div>
          <button
            onClick={onAddItem}
            title="添加新资产凭证"
            className="p-2 rounded-lg bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] border border-[#00D4FF]/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 列表条目 */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1F2937]/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              无匹配的数字资产记录
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0A2540]/80 border-l-4 border-l-[#00D4FF]'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#061524] border border-[#1F2937]">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-100 truncate max-w-[170px]">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                          {item.username || getCategoryLabel(item.category)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 资产详情主面板 */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#061524]/90 flex flex-col">
        {selectedItem ? (
          <div className="max-w-3xl space-y-6">
            {/* 头部标题与操作 */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1F2937]">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#0A2540] border border-[#00D4FF]/30">
                  {getCategoryIcon(selectedItem.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedItem.title}
                    </h2>
                    <span className="badge badge-cyan text-[10px]">
                      {getCategoryLabel(selectedItem.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    最后更新: {new Date(selectedItem.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditItem(selectedItem)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  编辑
                </button>
                <button
                  onClick={() => onDeleteItem(selectedItem.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                  title="删除资产"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 核心凭据详情卡片 */}
            <div className="vault-card p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#00D4FF] font-semibold">
                认证凭证与机密密钥
              </h3>

              {selectedItem.username && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#061524] border border-[#1F2937]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      用户名 / 账号凭证
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-100">
                      {selectedItem.username}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(selectedItem.username!, `user-${selectedItem.id}`)
                    }
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
                    title="复制账号"
                  >
                    {copiedField === `user-${selectedItem.id}` ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {selectedItem.password && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#061524] border border-[#1F2937]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      密码 / 安全代码 (AES-256 加密)
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-100 tracking-wider">
                      {revealedPasswords[selectedItem.id]
                        ? selectedItem.password
                        : '••••••••••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleReveal(selectedItem.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
                      title={
                        revealedPasswords[selectedItem.id] ? '隐藏密码' : '显示密码'
                      }
                    >
                      {revealedPasswords[selectedItem.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        handleCopy(selectedItem.password!, `pass-${selectedItem.id}`)
                      }
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
                      title="复制密码"
                    >
                      {copiedField === `pass-${selectedItem.id}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.url && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#061524] border border-[#1F2937]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      服务入口 / 平台地址
                    </span>
                    <span className="text-xs text-[#00D4FF] hover:underline font-mono">
                      {selectedItem.url}
                    </span>
                  </div>
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* 自定义敏感字段卡片 */}
            {selectedItem.customFields && selectedItem.customFields.length > 0 && (
              <div className="vault-card p-5 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#00D4FF] font-semibold">
                  自定义继承凭据字段
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedItem.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg bg-[#061524] border border-[#1F2937] flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block font-mono truncate">
                          {field.name}
                        </span>
                        <span className="text-xs font-mono text-slate-100 truncate block">
                          {field.isSecret && !revealedPasswords[field.id]
                            ? '••••••••••'
                            : field.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {field.isSecret && (
                          <button
                            onClick={() => toggleReveal(field.id)}
                            className="p-1 text-slate-400 hover:text-white"
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
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {copiedField === field.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 安全遗嘱与继承人嘱托 */}
            {selectedItem.notes && (
              <div className="vault-card p-5 space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  继承人指示与遗嘱嘱托 (离世后激活可见)
                </h3>
                <div className="p-3 rounded-lg bg-[#061524] border border-amber-500/20 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedItem.notes}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <Lock className="w-12 h-12 text-[#1F2937]" />
            <p className="text-sm">选择左侧资产查看详情，或点击上方「+」添加新数字资产</p>
          </div>
        )}
      </main>
    </div>
  );
};
