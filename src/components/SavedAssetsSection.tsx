import React, { useState } from 'react';
import {
  Layers,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Plus,
} from 'lucide-react';
import { VaultItem } from '../types';
import { getCategoryDef } from '../services/categories';

interface SavedAssetsSectionProps {
  items: VaultItem[];
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (id: string) => void;
  onAddNew: () => void;
}

export const SavedAssetsSection: React.FC<SavedAssetsSectionProps> = ({
  items,
  onEditItem,
  onDeleteItem,
  onAddNew,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="w-full max-w-5xl mx-auto my-6 px-4 select-none">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-[#00D4FF]" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            当前数字遗产库已存资产 ({items.length})
          </h2>
        </div>

        <button
          onClick={onAddNew}
          className="text-xs text-[#00D4FF] hover:underline font-semibold inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加更多</span>
        </button>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => {
            const def = getCategoryDef(item.category);
            const ItemIcon = def.icon;
            const isRevealed = revealedIds[item.id];

            return (
              <div
                key={item.id}
                className="group p-4 rounded-2xl bg-[#141828] hover:bg-[#1A2035] border border-white/5 hover:border-white/20 transition-all duration-150 shadow-md flex flex-col justify-between"
              >
                {/* 头部：分类图标 + 标题 + 编辑删除 */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: def.bgColor }}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {def.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditItem(item)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5"
                        title="编辑资产"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/5"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 核心凭证字段 */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-[#0F1322] border border-white/5 text-xs font-mono">
                    {item.username && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">账号:</span>
                        <div className="flex items-center gap-1 truncate max-w-[180px]">
                          <span className="text-slate-200 truncate">{item.username}</span>
                          <button
                            onClick={() => handleCopy(item.username!, `u-${item.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedId === `u-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.password && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px]">口令:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-200">
                            {isRevealed ? item.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleReveal(item.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleCopy(item.password!, `p-${item.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedId === `p-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.customFields && item.customFields.length > 0 && (
                      <div className="pt-1 border-t border-white/5 text-[10px] text-slate-400 font-sans">
                        包含 {item.customFields.length} 个专属参数属性
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部备注提示 */}
                {item.notes && (
                  <p className="text-[11px] text-slate-400 truncate mt-2.5 italic">
                    &quot;{item.notes}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-500 bg-[#141828]/50 rounded-2xl border border-dashed border-white/10">
          <p className="text-xs">暂未添加任何资产，请在上方点击任一模板立即录入</p>
        </div>
      )}
    </section>
  );
};
