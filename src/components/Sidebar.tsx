import React from 'react';
import {
  Layers,
  KeyRound,
  FileText,
  CreditCard,
  Award,
  Gamepad2,
  Clock,
  Usb,
  ShieldCheck,
  ChevronDown,
  Lock,
  Unlock,
  Plus,
} from 'lucide-react';
import { VaultCategory } from '../types';

interface SidebarProps {
  selectedNav: 'all' | VaultCategory | 'plan' | 'unlock';
  onSelectNav: (nav: 'all' | VaultCategory | 'plan' | 'unlock') => void;
  itemCounts: {
    all: number;
    login: number;
    note: number;
    card: number;
    license: number;
    game: number;
  };
  isUnlocked: boolean;
  onAddNew: () => void;
  onToggleLock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedNav,
  onSelectNav,
  itemCounts,
  isUnlocked,
  onAddNew,
  onToggleLock,
}) => {
  return (
    <aside className="w-64 bg-[#0A0F1D] border-r border-white/5 flex flex-col h-full flex-shrink-0 select-none">
      {/* 顶部 1Password 风格保险库选择器 */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0572EC] to-[#00D4FF] p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-[#0E1525] rounded-[6px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-white truncate font-mono">
                LegacyLock
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {isUnlocked ? '已认证 (双U盘就绪)' : '离线军规密文库'}
            </p>
          </div>
        </div>

        <button
          onClick={onAddNew}
          className="p-1.5 rounded-lg bg-[#0572EC] hover:bg-[#1882FB] text-white transition-colors shadow-sm"
          title="新建项目 (Ctrl+N)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 资产分类列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            保险库分类
          </div>

          <nav className="space-y-0.5">
            <button
              onClick={() => onSelectNav('all')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'all'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'all' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span>全部项目</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'all' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.all}
              </span>
            </button>

            <button
              onClick={() => onSelectNav('login')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'login'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'login' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span>登录信息</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'login' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.login}
              </span>
            </button>

            <button
              onClick={() => onSelectNav('game')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'game'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'game' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span>游戏数字遗产</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'game' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.game}
              </span>
            </button>

            <button
              onClick={() => onSelectNav('note')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'note'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'note' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span>安全便签 / 遗嘱</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'note' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.note}
              </span>
            </button>

            <button
              onClick={() => onSelectNav('card')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'card'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'card' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span>信用卡与离岸财务</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'card' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.card}
              </span>
            </button>

            <button
              onClick={() => onSelectNav('license')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'license'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'license' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span>软件授权与产品密钥</span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  selectedNav === 'license' ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {itemCounts.license}
              </span>
            </button>
          </nav>
        </div>

        {/* 军规继承与硬件中心 */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            数字遗产与硬件中心
          </div>

          <nav className="space-y-0.5">
            <button
              onClick={() => onSelectNav('unlock')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'unlock'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'unlock' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <Usb className="w-3.5 h-3.5 text-[#00D4FF]" />
                </div>
                <span>双U盘联合解锁</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => onSelectNav('plan')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedNav === 'plan'
                  ? 'bg-[#0572EC] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    selectedNav === 'plan' ? 'bg-white/20' : 'bg-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span>继承计划与U盘配置</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* 底部保险箱状态与锁定按钮 */}
      <div className="p-3 border-t border-white/5 bg-[#080D1A]">
        <button
          onClick={onToggleLock}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            {isUnlocked ? (
              <Unlock className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-medium text-slate-200">
              {isUnlocked ? '双U盘模式：已激活' : '密码库状态：已锁定'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {isUnlocked ? '重新加锁' : '解锁'}
          </span>
        </button>
      </div>
    </aside>
  );
};
