/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 继承人只读接管与交接视图组件 (HeirRecoveryView)
 * ============================================================================
 * 
 * 核心设计准则：
 * 1. 单向只读审计模式：继承人身后完成双 U 盘联合激活后进入该模式，严禁任何增、删、改操作，杜绝篡改遗产；
 * 2. 结构化资产提取：允许查阅密码、助记词、银行账号，并提供 30 秒自毁的安全剪贴板复制；
 * 3. 继承人专属嘱托置顶：高亮展示所有者生前为继承人撰写的特定交接指导留言；
 * 4. XSS 与钓鱼防护：通过 getSafeUrl 严格过滤非 http/https 协议，阻断 javascript: 伪协议执行。
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Printer,
  Lock,
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Info,
  Crown,
} from 'lucide-react';
import { VaultItem } from '../types';
import { CATEGORIES, getCategoryDef } from '../services/categories';
import { copyToClipboard } from '../services/clipboardService';

/**
 * 安全 URL 过滤与校验函数 (防御 XSS 与协议注入)
 * @param rawUrl 原始用户输入的网址
 * @returns {string | null} 仅返回协议合法的 http:// 或 https:// 网址
 */
function getSafeUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/**
 * 继承人只读视图属性接口
 */
interface HeirRecoveryViewProps {
  /** 已解密恢复的资产列表 */
  items: VaultItem[];
  /** 法定继承人姓名 */
  heirName: string;
  /** 密库唯一标识 GUID */
  vaultId: string;
  /** 退出继承接管视图回调 */
  onExitRecovery: () => void;
  /** 是否允许修改 (已接管控制权时为 true) */
  canModify?: boolean;
  /** 请求接管控制权回调 (打开 TakeoverControlModal) */
  onRequestTakeover?: () => void;
}

export const HeirRecoveryView: React.FC<HeirRecoveryViewProps> = ({
  items,
  heirName,
  vaultId,
  onExitRecovery,
  canModify,
  onRequestTakeover,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [activeInstructionItem, setActiveInstructionItem] = useState<VaultItem | null>(null);

  const handleCopy = (text: string, key: string) => {
    copyToClipboard(text, { isSensitive: true });
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(q) ||
      (item.username && item.username.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q)) ||
      (item.inheritanceInstructions && item.inheritanceInstructions.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // 一键导出明文接管清单
  const handleExportDecryptedJson = () => {
    const exportData = {
      title: 'LegacyLock 数字遗产接管交接清单',
      heir: heirName,
      vaultId,
      exportedAt: new Date().toISOString(),
      totalItems: items.length,
      items: items.map((i) => ({
        category: getCategoryDef(i.category).name,
        title: i.title,
        account: i.username || '',
        password: i.password || '',
        url: i.url || '',
        instructions: i.inheritanceInstructions || '',
        notes: i.notes || '',
        customFields: i.customFields || [],
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LegacyLock_数字遗产接管清单_${heirName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 触发浏览器打印接管单
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-[#090C16] select-none text-slate-200">
      {/* 顶部军规只读醒目状态横幅 (Doc v2 Section 41) */}
      <div className="p-4 bg-gradient-to-r from-purple-950/80 via-[#13192F] to-indigo-950/80 border-b border-purple-500/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center flex-shrink-0 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                LegacyLock Recovery Mode · 继承人只读接管模式
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-mono font-bold border border-purple-400/30">
                READ-ONLY HEIR
              </span>
            </div>
            <p className="text-xs text-purple-200/70 mt-0.5">
              法定继承人：<strong className="text-white">{heirName}</strong> · 密码学所有者签名有效 · 所有编辑删除权限已受控锁定
            </p>
          </div>
        </div>

        {/* 顶部操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 👑 接管控制权按钮 */}
          {!canModify && onRequestTakeover && (
            <button
              onClick={onRequestTakeover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/40 to-indigo-600/40 hover:from-amber-600/60 hover:to-indigo-600/60 border border-amber-400/40 text-xs font-bold text-amber-200 transition-all shadow-lg shadow-amber-500/10"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>接管控制权 (转为所有者)</span>
            </button>
          )}
          {canModify && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold text-emerald-300">
              <Crown className="w-3.5 h-3.5" />
              已接管完全控制权 (读写模式)
            </span>
          )}

          <button
            onClick={handleExportDecryptedJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/30 text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出解密清单 (JSON)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>打印遗产单</span>
          </button>

          <button
            onClick={onExitRecovery}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 hover:text-white transition-all ml-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>退出接管模式</span>
          </button>
        </div>
      </div>

      {/* 搜索与分类导航 */}
      <div className="p-4 border-b border-white/5 bg-[#0C101F] flex items-center justify-between gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索接管资产名称、账号、密码或接管指示..."
            className="w-full pl-10 pr-4 py-2 bg-[#171C2E] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* 分类快捷药丸 */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scroll">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            全部 ({items.length})
          </button>

          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.id).length;
            if (count === 0) return null;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 资产卡片网格展示 (只读接管风格) */}
      <div className="flex-1 overflow-y-auto p-6 custom-scroll">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>
              显示 {filteredItems.length} 项资产 (基于 LVCF 2.0 容器恢复)
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <Lock className="w-3 h-3" />
              只读接管：已彻底禁用写回与修改
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const def = getCategoryDef(item.category);
              const ItemIcon = def.icon;
              const isRevealed = revealedIds[item.id];

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#131828] border border-white/5 shadow-md flex flex-col justify-between hover:border-purple-500/30 transition-all"
                >
                  <div>
                    {/* 头部标题与分类 */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: def.bgColor }}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-white truncate">
                            {item.title}
                          </h3>
                          <span className="text-[10px] text-purple-300 font-sans">
                            {def.name}
                          </span>
                        </div>
                      </div>

                      {item.inheritanceInstructions && (
                        <button
                          onClick={() => setActiveInstructionItem(item)}
                          className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg"
                          title="查看所有者预留的接管向导指示"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>接管指南</span>
                        </button>
                      )}
                    </div>

                    {/* 凭证项 */}
                    <div className="space-y-2 p-3 rounded-xl bg-[#0D1220] border border-white/5 text-xs font-mono">
                      {item.username && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[10px]">账号:</span>
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <span className="text-slate-200 truncate">{item.username}</span>
                            <button
                              onClick={() => handleCopy(item.username!, `u-${item.id}`)}
                              className="text-slate-400 hover:text-white"
                              title="复制账号"
                            >
                              {copiedKey === `u-${item.id}` ? (
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
                          <span className="text-slate-500 text-[10px]">密码:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200 tracking-wider">
                              {isRevealed ? item.password : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleReveal(item.id)}
                              className="text-slate-400 hover:text-white"
                              title={isRevealed ? '隐藏密码' : '显示密码'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleCopy(item.password!, `p-${item.id}`)}
                              className="text-slate-400 hover:text-white"
                              title="复制密码"
                            >
                              {copiedKey === `p-${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {item.url && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-[10px]">端点:</span>
                          {getSafeUrl(item.url) ? (
                            <a
                              href={getSafeUrl(item.url)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00D4FF] hover:underline truncate max-w-[200px] flex items-center gap-1"
                            >
                              <span className="truncate">{item.url}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">{item.url}</span>
                          )}
                        </div>
                      )}

                      {/* 专属属性列表 */}
                      {item.customFields && item.customFields.length > 0 && (
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          {item.customFields.map((f) => (
                            <div key={f.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 truncate max-w-[90px]">{f.name}:</span>
                              <div className="flex items-center gap-1 truncate max-w-[180px]">
                                <span className="text-slate-300 truncate">
                                  {f.isSecret && !revealedIds[f.id] ? '••••••••' : f.value}
                                </span>
                                {f.isSecret && (
                                  <button
                                    onClick={() => toggleReveal(f.id)}
                                    className="text-slate-500 hover:text-white"
                                  >
                                    {revealedIds[f.id] ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleCopy(f.value, f.id)}
                                  className="text-slate-500 hover:text-white"
                                >
                                  {copiedKey === f.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </div>
                          ))}
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
        </div>
      </div>

      {/* 数字资产接管向导指示弹窗 (Asset Transfer Assistant Modal - Doc v2 Section 42) */}
      {activeInstructionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141829] border border-amber-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  接管向导指示 · {activeInstructionItem.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveInstructionItem(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0D111E] border border-white/5 space-y-2 text-xs leading-relaxed text-slate-300">
              <p className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                所有者给继承人预留的移交步骤说明：
              </p>
              <p className="whitespace-pre-wrap text-slate-200">
                {activeInstructionItem.inheritanceInstructions}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveInstructionItem(null)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                已了解接管指引
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
