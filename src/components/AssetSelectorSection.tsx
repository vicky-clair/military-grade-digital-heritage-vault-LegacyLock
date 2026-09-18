import React, { useState, useMemo } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '../services/categories';
import { VaultCategory } from '../types';

interface AssetSelectorSectionProps {
  onSelectCategory: (category: VaultCategory) => void;
}

export const AssetSelectorSection: React.FC<AssetSelectorSectionProps> = ({
  onSelectCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(true);

  // 顶部 6 个核心大卡片
  const primaryCategories = useMemo(
    () => CATEGORIES.filter((c) => c.isPrimary),
    []
  );

  // 下方 16 个双列药丸条目
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

  return (
    <section className="relative w-full max-w-3xl mx-auto pt-2 pb-6 px-4 select-none">
      {/* 顶部标题栏：与用户图片完全一致 */}
      <div className="text-center mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/95">
          你想要添加什么？
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          点击任意资产模板立即填写录入，数据将在本地以 AES-256-GCM 离线军规加密
        </p>
      </div>

      {/* 搜索框：完全吻合图片样式 */}
      <div className="max-w-xl mx-auto mb-6">
        <div className="relative flex items-center shadow-lg">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="尝试搜索任意内容"
            className="w-full pl-11 pr-10 py-3 bg-[#1C2132] hover:bg-[#20263A] border border-white/10 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0572EC] focus:ring-2 focus:ring-[#0572EC]/30 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 模板网格容器 */}
      <div className="space-y-4">
        {/* 顶部主要分类（6个大卡片：3列 x 2行） */}
        {filteredPrimary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredPrimary.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="group flex flex-col items-start p-4 rounded-2xl bg-[#171B2B] hover:bg-[#20273D] border border-white/10 hover:border-white/25 transition-all duration-200 text-left shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0 relative overflow-hidden"
                >
                  {/* 悬停边缘环境光 */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/15 transition-all pointer-events-none" />

                  {/* 图标容器 */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 shadow-inner"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* 标题与英文标签 */}
                  <span className="text-sm font-bold text-slate-200 group-hover:text-white tracking-wide">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 下方次要分类（16个双列药丸条目） */}
        {showMore && filteredSecondary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {filteredSecondary.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="group flex items-center gap-3.5 px-4 py-3 rounded-xl bg-[#171B2B]/90 hover:bg-[#20273D] border border-white/10 hover:border-white/25 transition-all duration-150 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: cat.bgColor }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate block">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {cat.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 无搜索结果提示 */}
        {filteredPrimary.length === 0 && filteredSecondary.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-[#171B2B]/50 rounded-2xl border border-dashed border-white/10">
            <p className="text-sm">未找到与 &quot;{searchQuery}&quot; 相关的资产模板</p>
            <p className="text-xs text-slate-500 mt-1">
              建议点击上方「安全备注」或「文档」以自由填写任何个性化数据
            </p>
          </div>
        )}
      </div>

      {/* 底部折叠/展开开关 */}
      <div className="pt-4 flex items-center justify-center">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold py-1.5 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/5"
        >
          <span>{showMore ? '显示更少' : '显示更多 (共 22 类资产)'}</span>
          {showMore ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </section>
  );
};
