import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Lock,
  Unlock,
  Sparkles,
  Activity,
} from 'lucide-react';

import { OperatingMode } from '../types';

interface HeaderBarProps {
  itemCount: number;
  isUnlocked: boolean;
  onRefreshDrives: () => void;
  isScanningDrives: boolean;
  detectedDrivesCount: number;
  operatingMode?: OperatingMode;
  onToggleMode?: () => void;
  healthScore?: number;
  onOpenHealthCheck?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  itemCount,
  isUnlocked,
  onRefreshDrives,
  isScanningDrives,
  detectedDrivesCount,
  operatingMode = 'OWNER',
  onToggleMode,
  healthScore = 100,
  onOpenHealthCheck,
}) => {
  return (
    <header className="h-16 px-6 bg-[#0E121E] border-b border-white/10 flex items-center justify-between flex-shrink-0 select-none">
      {/* 左侧：品牌 Logo 与核心安全标识 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0572EC] to-[#00D4FF] p-0.5 shadow-lg flex items-center justify-center">
          <div className="w-full h-full bg-[#0A0E1A] rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#00D4FF]" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight font-mono">
              LegacyLock
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-[#00D4FF] border border-blue-500/30 font-medium">
              军规级数字遗产锁
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Rust X25519 物理隔离 · 主从非对称授权
          </p>
        </div>
      </div>

      {/* 右侧：存储设备快速状态与统计 */}
      <div className="flex items-center gap-3">
        {/* 健康自检得分徽章 (Doc v2 规范) */}
        {onOpenHealthCheck && (
          <button
            onClick={onOpenHealthCheck}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-400 transition-colors"
            title="查看密库 6 项健康与完整性自检结果"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="text-slate-300">健康分:</span>
            <span className="font-mono font-bold text-emerald-400">{healthScore}%</span>
          </button>
        )}

        {/* 硬件介质状态提示 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141929] border border-white/10 text-xs">
          <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-300">介质:</span>
          <span className="font-mono font-semibold text-emerald-400">
            {detectedDrivesCount > 0 ? `${detectedDrivesCount} 盘在线` : '检测中'}
          </span>
          <button
            onClick={onRefreshDrives}
            disabled={isScanningDrives}
            className="ml-1 p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 disabled:opacity-50 transition-colors"
            title="刷新检测可移动存储介质"
          >
            <RefreshCw className={`w-3 h-3 ${isScanningDrives ? 'animate-spin text-[#00D4FF]' : ''}`} />
          </button>
        </div>

        {/* 资产数量徽章 */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141929] border border-white/10 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">已录资产:</span>
          <span className="font-mono font-bold text-white">{itemCount}</span>
        </div>

        {/* 认证状态指示 */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border ${
            isUnlocked
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-white/5 border-white/10 text-slate-300'
          }`}
          title={isUnlocked ? '双介质联合认证通过' : '当前处于本地离线保险库环境'}
        >
          {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isUnlocked ? '已认证' : '就绪'}</span>
        </div>

        {/* 运行模式徽章与一键切换 */}
        <div className="flex items-center gap-1">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              operatingMode === 'OWNER'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
            }`}
          >
            {operatingMode === 'OWNER' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{operatingMode === 'OWNER' ? '所有者管理 (RW)' : '继承人只读接管'}</span>
          </div>

          {onToggleMode && (
            <button
              onClick={onToggleMode}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
              title={operatingMode === 'OWNER' ? '切换至继承人只读接管模式查看' : '返回所有者管理模式'}
            >
              {operatingMode === 'OWNER' ? '切到接管模式' : '切回管理模式'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
