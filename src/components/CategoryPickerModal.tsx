import React, { useState } from 'react';
import {
  X,
  Search,
  Lock,
  FileText,
  CreditCard,
  UserCheck,
  KeyRound,
  FileCode,
  Terminal,
  Code2,
  Award,
  Wallet,
  Activity,
  Gift,
  TreePine,
  Globe,
  Database,
  Router,
  Server,
  Mail,
  Shield,
  FileCheck,
  CircleDollarSign,
  Car,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VaultCategory } from '../types';

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: VaultCategory) => void;
}

interface CategoryOption {
  id: VaultCategory;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg: string;
  isPrimary?: boolean;
}

const PRIMARY_CATEGORIES: CategoryOption[] = [
  { id: 'login', name: '登录信息', icon: Lock, iconBg: '#0284C7', isPrimary: true },
  { id: 'password', name: '安全备注', icon: FileText, iconBg: '#F59E0B', isPrimary: true },
  { id: 'identity', name: '信用卡', icon: CreditCard, iconBg: '#06B6D4', isPrimary: true },
  { id: 'identity', name: '身份标识', icon: UserCheck, iconBg: '#10B981', isPrimary: true },
  { id: 'password', name: '密码', icon: KeyRound, iconBg: '#14B8A6', isPrimary: true },
  { id: 'softwareLicense', name: '文档', icon: FileCode, iconBg: '#38BDF8', isPrimary: true },
];

const SECONDARY_CATEGORIES: CategoryOption[] = [
  { id: 'sshKey', name: 'SSH 密钥', icon: Terminal, iconBg: '#475569' },
  { id: 'apiCredential', name: 'API 凭据', icon: Code2, iconBg: '#0D9488' },
  { id: 'membership', name: '会员信息', icon: Award, iconBg: '#9333EA' },
  { id: 'cryptoWallet', name: '加密钱包', icon: Wallet, iconBg: '#2563EB' },
  { id: 'identity', name: '医疗记录', icon: Activity, iconBg: '#E11D48' },
  { id: 'membership', name: '奖励', icon: Gift, iconBg: '#DB2777' },
  { id: 'license', name: '户外许可证', icon: TreePine, iconBg: '#16A34A' },
  { id: 'identity', name: '护照', icon: Globe, iconBg: '#0284C7' },
  { id: 'database', name: '数据库', icon: Database, iconBg: '#4F46E5' },
  { id: 'router', name: '无线路由器', icon: Router, iconBg: '#0284C7' },
  { id: 'server', name: '服务器', icon: Server, iconBg: '#64748B' },
  { id: 'email', name: '电子邮件', icon: Mail, iconBg: '#E11D48' },
  { id: 'identity', name: '社会保险号码', icon: Shield, iconBg: '#2563EB' },
  { id: 'softwareLicense', name: '软件许可', icon: FileCheck, iconBg: '#0284C7' },
  { id: 'identity', name: '银行账户', icon: CircleDollarSign, iconBg: '#D97706' },
  { id: 'license', name: '驾驶执照', icon: Car, iconBg: '#DB2777' },
];

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(true);

  if (!isOpen) return null;

  const filterList = (list: CategoryOption[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(q));
  };

  const filteredPrimary = filterList(PRIMARY_CATEGORIES);
  const filteredSecondary = filterList(SECONDARY_CATEGORIES);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ width: '480px', maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Exact match to reference image 1) */}
        <div className="cat-picker-header">
          <button className="cat-picker-close" onClick={onClose}>
            <X style={{ width: 18, height: 18 }} />
          </button>

          <h2 className="cat-picker-title">你想要添加什么？</h2>

          <div className="cat-search-box">
            <Search style={{ width: 16, height: 16, color: '#7E92C4' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="尝试搜索任意内容"
              autoFocus
              className="search-input"
            />
          </div>
        </div>

        {/* Scrollable Categories List */}
        <div className="cat-picker-body">
          {/* Top 6 Large Tiles (3x2 Grid) */}
          {filteredPrimary.length > 0 && (
            <div className="cat-top-grid">
              {filteredPrimary.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={`${cat.name}-${idx}`}
                    className="cat-tile-large"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: cat.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      <Icon style={{ width: 18, height: 18, color: '#FFFFFF' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                      {cat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Secondary 2-Column List Grid */}
          {showAll && filteredSecondary.length > 0 && (
            <div className="cat-list-grid">
              {filteredSecondary.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={`${cat.name}-${idx}`}
                    className="cat-pill-row"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: cat.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: 14, height: 14, color: '#FFFFFF' }} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: '#E2E8F0' }}>
                      {cat.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Expand/Collapse Toggle */}
          {!search && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  fontSize: 12,
                  color: '#9BB0DD',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{showAll ? '显示更少' : '显示更多'}</span>
                {showAll ? (
                  <ChevronUp style={{ width: 14, height: 14 }} />
                ) : (
                  <ChevronDown style={{ width: 14, height: 14 }} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
