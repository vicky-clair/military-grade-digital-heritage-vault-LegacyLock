import React, { useState, useMemo } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '../services/categories';
import { VaultCategory } from '../types';

interface AddItemSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: VaultCategory) => void;
}

export const AddItemSelectorModal: React.FC<AddItemSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(true); // 默认完整展示，可折叠

  // 区分主要（顶部 6 个大卡片）与次要（下方 16 个双列项）
  const primaryCategories = useMemo(
    () => CATEGORIES.filter((c) => c.isPrimary),
    []
  );

  const secondaryCategories = useMemo(
    () => CATEGORIES.filter((c) => !c.isPrimary && c.id !== 'game'),
    []
  );

  // 搜索过滤
  const filteredPrimary = useMemo(() => {
    if (!searchQuery.trim()) return primaryCategories;
    const q = searchQuery.toLowerCase();
    return primaryCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.englishName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [primaryCategories, searchQuery]);

  const filteredSecondary = useMemo(() => {
    if (!searchQuery.trim()) return secondaryCategories;
    const q = searchQuery.toLowerCase();
    return secondaryCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.englishName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [secondaryCategories, searchQuery]);

  if (!isOpen) return null;

  const handleSelect = (cat: VaultCategory) => {
    onSelectCategory(cat);
    onClose();
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* 弹窗主体 - 1Password 风格暗黑玻璃质感 */}
      <div
        className="relative w-full max-w-[620px] max-h-[90vh] bg-[#181A24] border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-white transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部环境微光 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-indigo-500/15 via-purple-500/5 to-transparent blur-2xl pointer-events-none" />

        {/* 标题栏与右上角关闭按钮 */}
        <div className="relative pt-6 pb-4 px-7 flex items-center justify-between">
          <div className="w-6" /> {/* 占位以保持居中 */}
          <h2 className="text-xl font-bold tracking-tight text-white/95">
            你想要添加什么？
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="px-7 pb-4">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="尝试搜索任意内容"
              className="w-full pl-10 pr-9 py-2.5 bg-[#222533] border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#0572EC] focus:ring-1 focus:ring-[#0572EC]/50 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 模板网格可滚动容器 */}
        <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-4 pr-5 custom-scroll">
          {/* 顶部主要分类（6个大卡片：3列 x 2行） */}
          {filteredPrimary.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {filteredPrimary.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className="group flex flex-col items-start p-4 rounded-xl bg-[#202330] hover:bg-[#282C3E] border border-white/5 hover:border-white/20 transition-all duration-150 text-left shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {/* 图标容器 */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: cat.bgColor }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-white tracking-wide">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 下方次要分类（16个双列药丸条目） */}
          {showMore && filteredSecondary.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {filteredSecondary.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#202330]/85 hover:bg-[#282C3E] border border-white/5 hover:border-white/20 transition-all duration-150 text-left hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: cat.bgColor }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white truncate">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 无搜索结果 */}
          {filteredPrimary.length === 0 && filteredSecondary.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm">未找到与 &quot;{searchQuery}&quot; 相关的模板</p>
              <p className="text-xs text-slate-500 mt-1">
                您可以选择「安全备注」或「文档」以自定义存储此项
              </p>
            </div>
          )}
        </div>

        {/* 底部折叠/展开开关 */}
        <div className="border-t border-white/5 py-3 px-7 bg-[#151720] flex items-center justify-center">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium py-1 px-3 rounded-lg hover:bg-white/5"
          >
            <span>{showMore ? '显示更少' : '显示更多'}</span>
            {showMore ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
