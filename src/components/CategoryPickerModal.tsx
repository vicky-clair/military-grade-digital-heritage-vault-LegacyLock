/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 资产分类选择弹窗组件 (CategoryPickerModal)
 * ============================================================================
 * 
 * 界面交互设计 (Human-Centric & Modern Glassmorphism Redesign)：
 * 1. 响应「+ 添加新资产 / 密钥」或主界面行动按钮，唤起结构化资产分类选择面板；
 * 2. 宽幅 720px 奢华军规暗黑毛玻璃容器，告别拥挤局促，层级清晰舒适；
 * 3. 顶部提供实时模糊检索（支持中文名、英文名、用途描述及专属字段关键词），并配备清空快捷键；
 * 4. 提供人性化分类切换药丸导航标签 (全部、⭐ 常用推荐、💻 技术运维、💰 财务资产、🪪 证照生活)；
 * 5. 采用双列现代交互式卡片，提供图标光环、中英文双模标签、通俗用途描述及专属字段预览标签；
 * 6. 支持键盘 ESC 快速退出，点击卡片即刻加载对应结构化资产模板并唤起录入弹窗。
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { VaultCategory } from '../types';
import { CATEGORIES, CategoryDefinition } from '../services/categories';

/**
 * 分类选择弹窗属性接口
 */
interface CategoryPickerModalProps {
  /** 弹窗显隐受控状态 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 选中分类后的触发回调 */
  onSelectCategory: (category: VaultCategory) => void;
}

/**
 * 人性化资产分组定义
 */
interface CategoryGroup {
  id: string;
  name: string;
  badge: string;
  categoryIds: VaultCategory[];
  description: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'popular',
    name: '常用推荐',
    badge: '⭐ 核心高频',
    categoryIds: ['login', 'note', 'card', 'identity', 'password', 'document'],
    description: '日常最高频使用的密码、卡片、身份与私密便签',
  },
  {
    id: 'tech',
    name: '技术运维',
    badge: '💻 基础设施',
    categoryIds: ['sshKey', 'apiCredential', 'server', 'database', 'router', 'softwareLicense', 'email'],
    description: '服务器运维、云平台开发密钥、路由器与生产数据库凭据',
  },
  {
    id: 'finance',
    name: '财务与资产',
    badge: '💰 资产与权益',
    categoryIds: ['cryptoWallet', 'bankAccount', 'membership', 'reward'],
    description: '区块链冷钱包助记词、银行对公储蓄、商务会所及航司里程',
  },
  {
    id: 'docs',
    name: '证照与生活',
    badge: '🪪 法定档案',
    categoryIds: ['passport', 'driverLicense', 'ssn', 'medical', 'outdoorLicense', 'game'],
    description: '护照跨境出行、驾驶证、医保急救卡、特种执照与数字遗产',
  },
];

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 监听 ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 打开弹窗时重置并聚焦搜索框
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveTab('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  // 建立 ID 到定义对象的快速映射
  const categoryMap = useMemo(() => {
    const map = new Map<VaultCategory, CategoryDefinition>();
    CATEGORIES.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, []);

  // 搜索过滤计算
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      if (activeTab === 'all') {
        return CATEGORIES;
      }
      const group = CATEGORY_GROUPS.find((g) => g.id === activeTab);
      if (!group) return CATEGORIES;
      return group.categoryIds
        .map((id) => categoryMap.get(id))
        .filter(Boolean) as CategoryDefinition[];
    }

    return CATEGORIES.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchEng = cat.englishName.toLowerCase().includes(q);
      const matchDesc = cat.description.toLowerCase().includes(q);
      const matchFields = cat.defaultFields?.some((f) =>
        f.name.toLowerCase().includes(q)
      );
      return matchName || matchEng || matchDesc || matchFields;
    });
  }, [search, activeTab, categoryMap]);

  // 统计每个分组的数量
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: CATEGORIES.length };
    CATEGORY_GROUPS.forEach((g) => {
      counts[g.id] = g.categoryIds.length;
    });
    return counts;
  }, []);

  if (!isOpen) return null;

  const isSearching = !!search.trim();

  return (
    <div className="modal-backdrop cat-modal-backdrop" onClick={onClose}>
      <div
        className="cat-modern-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-picker-title"
      >
        {/* Top Header */}
        <div className="cat-modern-header">
          <div className="cat-header-top-row">
            <div className="cat-title-cluster">
              <div className="cat-header-icon-badge">
                <Sparkles className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <h2 id="cat-picker-title" className="cat-header-title">
                  选择要添加的资产类型
                </h2>
                <p className="cat-header-subtitle">
                  采用军规零知识加密模板，为不同数据形态预设专属安全字段与防护
                </p>
              </div>
            </div>

            <button
              className="cat-modern-close-btn"
              onClick={onClose}
              title="按 ESC 或点击关闭"
              aria-label="关闭选择弹窗"
            >
              <span className="cat-close-kbd">ESC</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="cat-modern-search-wrapper">
            <div className="cat-modern-search-box">
              <Search className="w-4 h-4 text-[#7E92C4] flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索资产类型、凭据用途或字段 (如: 助记词、SSH、2FA、密码、信用卡、PIN...)"
                className="cat-modern-search-input"
              />
              {search && (
                <button
                  type="button"
                  className="cat-search-clear-btn"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  title="清空搜索"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Category Filter Tabs (Visible when not searching) */}
          {!isSearching ? (
            <div className="cat-tab-pills-bar">
              <button
                type="button"
                className={`cat-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <span>🌐 全部资产</span>
                <span className="cat-tab-badge">{groupCounts.all}</span>
              </button>
              {CATEGORY_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`cat-tab-pill ${activeTab === group.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(group.id)}
                >
                  <span>{group.name}</span>
                  <span className="cat-tab-badge">{groupCounts[group.id]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="cat-search-status-bar">
              <span>
                搜索关键词「<strong className="text-[#00D4FF]">{search}</strong>」：找到{' '}
                <strong className="text-white">{filteredCategories.length}</strong> 种匹配模板
              </span>
              <button
                type="button"
                className="cat-reset-search-link"
                onClick={() => setSearch('')}
              >
                返回全部
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Categories Body */}
        <div className="cat-modern-body">
          {filteredCategories.length === 0 ? (
            <div className="cat-empty-search-state">
              <div className="cat-empty-icon-circle">
                <FolderOpen className="w-8 h-8 text-[#7E92C4]" />
              </div>
              <h3 className="cat-empty-title">未找到匹配的资产类型</h3>
              <p className="cat-empty-desc">
                未能检索到与「{search}」完全匹配的预置模板。您可以尝试其他关键词，或直接基于通用文档进行记录。
              </p>
              <button
                type="button"
                className="cat-empty-reset-btn"
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                  searchInputRef.current?.focus();
                }}
              >
                重置搜索并查看全部模板
              </button>
            </div>
          ) : !isSearching && activeTab === 'all' ? (
            // 全部模式：按人性化分组渲染优雅的区块，避免一盘散沙
            <div className="cat-grouped-sections">
              {CATEGORY_GROUPS.map((group) => {
                const itemsInGroup = group.categoryIds
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean) as CategoryDefinition[];

                return (
                  <div key={group.id} className="cat-group-section">
                    <div className="cat-group-section-header">
                      <div className="cat-group-tag">{group.badge}</div>
                      <span className="cat-group-desc">{group.description}</span>
                    </div>

                    <div className="cat-cards-grid">
                      {itemsInGroup.map((cat) => (
                        <CategoryCard
                          key={cat.id}
                          cat={cat}
                          onSelect={() => {
                            onSelectCategory(cat.id);
                            onClose();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // 筛选或搜索结果网格
            <div className="cat-cards-grid">
              {filteredCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onSelect={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modern Ergonomic Footer */}
        <div className="cat-modern-footer">
          <div className="cat-footer-info">
            <ShieldCheck className="w-4 h-4 text-[#00D4FF] flex-shrink-0" />
            <span className="cat-footer-tip">
              所有模板均支持在创建后自由追加<strong>「自定义字段」</strong>与<strong>「加密附件 (≤2MB)」</strong>
            </span>
          </div>
          <button
            type="button"
            className="cat-footer-cancel-btn"
            onClick={onClose}
          >
            取消关闭
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 单个资产卡片组件 (双列交互卡片)
 */
interface CategoryCardProps {
  cat: CategoryDefinition;
  onSelect: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ cat, onSelect }) => {
  const Icon = cat.icon;

  return (
    <div
      className="cat-rich-card"
      onClick={onSelect}
      style={
        {
          '--cat-accent': cat.color,
          '--cat-accent-bg': cat.bgColor,
        } as React.CSSProperties
      }
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Visual Icon Badge */}
      <div
        className="cat-card-icon-container"
        style={{
          background: cat.bgColor,
          borderColor: `${cat.color}40`,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Card Content */}
      <div className="cat-card-content">
        <div className="cat-card-header-row">
          <div className="cat-card-title-wrap">
            <span className="cat-card-name">{cat.name}</span>
            <span className="cat-card-english-badge">{cat.englishName}</span>
          </div>
          <div className="cat-card-arrow-box">
            <ArrowRight className="w-3.5 h-3.5 cat-card-arrow" />
          </div>
        </div>

        <p className="cat-card-description" title={cat.description}>
          {cat.description}
        </p>

        {/* Preset field preview tags */}
        {cat.defaultFields && cat.defaultFields.length > 0 && (
          <div className="cat-card-field-tags">
            {cat.defaultFields.slice(0, 2).map((field, idx) => (
              <span key={idx} className="cat-field-tag">
                {field.name}
              </span>
            ))}
            {cat.defaultFields.length > 2 && (
              <span className="cat-field-tag cat-field-tag-more">
                +{cat.defaultFields.length - 2} 项预设
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
