import React from 'react';
import { Shield, Key, Lock, Unlock, Database, Clock, Usb } from 'lucide-react';

interface NavbarProps {
  activeTab: 'vault' | 'plan' | 'unlock';
  setActiveTab: (tab: 'vault' | 'plan' | 'unlock') => void;
  isUnlocked: boolean;
  itemCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isUnlocked,
  itemCount,
}) => {
  return (
    <header className="border-b border-[#1F2937] bg-[#061524]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 品牌标识 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2540] to-[#00D4FF] flex items-center justify-center p-0.5 shadow-lg shadow-[#00D4FF]/20 border border-[#00D4FF]/40">
              <div className="w-full h-full bg-[#061524] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#00D4FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  LegacyLock
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#0A2540] text-[#00D4FF] border border-[#00D4FF]/30">
                  遗产保险锁
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                两个U盘同时插电脑 · 军规级数字遗产保险箱
              </p>
            </div>
          </div>

          {/* 导航标签页 */}
          <nav className="flex items-center gap-1 bg-[#0A1C30]/80 p-1 rounded-xl border border-[#1F2937]">
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vault'
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>数字资产库 ({itemCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'plan'
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>继承计划与U盘配置</span>
            </button>

            <button
              onClick={() => setActiveTab('unlock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'unlock'
                  ? 'bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/60 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Usb className="w-4 h-4 text-[#00D4FF]" />
              <Key className="w-4 h-4" />
              <span>双U盘解锁模式</span>
            </button>
          </nav>

          {/* 右侧状态展示 */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                安全架构体系
              </span>
              <span className="text-xs font-mono text-[#00D4FF] font-medium">
                X25519 · AES-GCM · 物理隔离
              </span>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border ${
                isUnlocked
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/40'
                  : 'bg-[#0A2540] text-amber-400 border-amber-500/30'
              }`}
            >
              {isUnlocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>已解锁 (双U盘在场)</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>锁定中 (需双U盘)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
