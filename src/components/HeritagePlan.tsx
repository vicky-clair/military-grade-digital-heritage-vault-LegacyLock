import React, { useState } from 'react';
import {
  Clock,
  Shield,
  Usb,
  Download,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Key,
  Info,
  Sparkles,
} from 'lucide-react';
import { HeritagePlanConfig } from '../types';
import { generateDualUsbKeyBlobs, isElectronApp } from '../services/cryptoService';

interface HeritagePlanProps {
  plan: HeritagePlanConfig;
  onUpdatePlan: (newPlan: HeritagePlanConfig) => void;
}

export const HeritagePlan: React.FC<HeritagePlanProps> = ({
  plan,
  onUpdatePlan,
}) => {
  const [heirName, setHeirName] = useState(plan.heirName || '李华 (长子/法定继承人)');
  const [heirContact, setHeirContact] = useState(plan.heirContact || 'lihua_heir@family.org / 138-8888-9999');
  const [heirNotes, setHeirNotes] = useState(
    plan.heirNotes ||
      '在收到继承生效通知后，请携带本人专用的继承人U盘，前往书房保险箱获取用户U盘，同时插入电脑解锁全部数字资产。'
  );
  const [expiryDays, setExpiryDays] = useState(plan.expiryDays || 365);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGenerateUsbKeys = async () => {
    setIsGenerating(true);
    setStatusMessage('正在生成 X25519 密钥对并计算服务器防篡改时间戳...');

    try {
      if (isElectronApp() && window.legacyLockAPI) {
        const res = await window.legacyLockAPI.generateKeys({
          expiryDays,
        });

        if (res.success && res.data) {
          const newPlan: HeritagePlanConfig = {
            heirName,
            heirContact,
            heirNotes,
            expiryDays,
            expiryTimestamp: res.data.expiry_timestamp,
            serverHashHex: res.data.server_hash_hex,
            userPublicHex: res.data.user_public_hex,
            heirPublicHex: res.data.heir_public_hex,
            isConfigured: true,
          };
          onUpdatePlan(newPlan);
          setGenerateSuccess(true);
          setStatusMessage('Rust 军规核心已成功写入 user-key.bin, heir-key.bin, config.bin！');
        } else {
          throw new Error(res.error || 'Rust CLI 生成失败');
        }
      } else {
        const res = await generateDualUsbKeyBlobs(expiryDays);

        const newPlan: HeritagePlanConfig = {
          heirName,
          heirContact,
          heirNotes,
          expiryDays,
          expiryTimestamp: res.expiryTimestamp,
          serverHashHex: res.serverHashHex,
          userPublicHex: res.userPublicHex,
          heirPublicHex: res.heirPublicHex,
          isConfigured: true,
        };
        onUpdatePlan(newPlan);
        setGenerateSuccess(true);
        setStatusMessage('双U盘军规密钥包生成成功！请点击下方卡片下载文件分别拷入两个不同U盘。');
      }
    } catch (e: any) {
      setStatusMessage(`生成异常: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFile = async (type: 'user' | 'heir' | 'config') => {
    const res = await generateDualUsbKeyBlobs(expiryDays);
    let blob: Blob;
    let filename: string;

    if (type === 'user') {
      blob = res.userKeyBlob;
      filename = 'user-key.bin';
    } else if (type === 'heir') {
      blob = res.heirKeyBlob;
      filename = 'heir-key.bin';
    } else {
      blob = res.configBlob;
      filename = 'config.bin';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const expiryDate = new Date(
    (plan.expiryTimestamp || Math.floor(Date.now() / 1000) + expiryDays * 86400) * 1000
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto space-y-6">
      {/* 1Password 风格主横幅 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              数字遗产继承计划与硬件 U 盘配置
            </h1>
            <span className="op-badge op-badge-cyan">1Password Emergency Kit 标准</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            设置法定继承人、有效失效时间戳，并制作专用的两张硬件钥匙 U 盘。
          </p>
        </div>

        <button
          onClick={handleGenerateUsbKeys}
          disabled={isGenerating}
          className="op-btn-primary shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-[#00D4FF]" />
          <span>{isGenerating ? '正在生成中...' : '生成并重置双 U 盘密钥'}</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            generateSuccess
              ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-950/30 text-amber-300 border-amber-500/30'
          }`}
        >
          {generateSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 两列配置卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 继承人资料配置 */}
        <div className="op-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-4 h-4 text-[#0572EC]" />
            <h3 className="text-sm font-bold">法定指定继承人资料</h3>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              继承人姓名 / 称谓
            </label>
            <input
              type="text"
              value={heirName}
              onChange={(e) => setHeirName(e.target.value)}
              className="op-input font-medium"
              placeholder="例如: 李华 (长子)"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              紧急信箱 / 联络电话
            </label>
            <input
              type="text"
              value={heirContact}
              onChange={(e) => setHeirContact(e.target.value)}
              className="op-input font-mono text-xs"
              placeholder="例如: heir@example.com / 138-0000-0000"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
              离世激活指引函 (安全便签说明)
            </label>
            <textarea
              rows={4}
              value={heirNotes}
              onChange={(e) => setHeirNotes(e.target.value)}
              className="op-input resize-none text-xs leading-relaxed"
              placeholder="说明两枚U盘各自存放的位置..."
            />
          </div>
        </div>

        {/* 计划有效期与时间戳 */}
        <div className="op-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold">继承有效周期与防滥用时间戳</h3>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                继承计划有效期限
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="op-input font-mono text-xs"
              >
                <option value={30}>30 天 (快速测试)</option>
                <option value={90}>90 天 (3 个月)</option>
                <option value={180}>180 天 (半年)</option>
                <option value={365}>365 天 (1 年标准期)</option>
                <option value={1095}>1095 天 (3 年长周期)</option>
                <option value={3650}>3650 天 (10 年守护期)</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-[#0E1525] border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">失效截止时间:</span>
                <span className="font-mono text-[#00D4FF] font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Unix 硬件校验时间戳:</span>
                <span className="font-mono text-slate-300">
                  {plan.expiryTimestamp ||
                    Math.floor(Date.now() / 1000) + expiryDays * 86400}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5 leading-relaxed">
                超过截止时间后，即使两枚U盘同时插入也将被拦截拒绝，彻底避免历史计划被非法人员长期滥用。
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0572EC]/10 border border-[#0572EC]/25 flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-[#00D4FF] flex-shrink-0 mt-0.5" />
            <p>
              修改继承人或时间后，请务必点击上方按钮重新生成并下载对应的 U 盘密钥文件。
            </p>
          </div>
        </div>
      </div>

      {/* 两个硬件U盘制作与文件下载 */}
      <div className="op-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Usb className="w-4 h-4 text-[#0572EC]" />
            物理硬件 U 盘制作（纯两个U盘模式）
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            将生成的专有密钥文件分别拷入两只不同的物理 U 盘根目录。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* U盘 1: 用户持有的主U盘 */}
          <div className="p-4 rounded-xl bg-[#0E1525] border border-[#0572EC]/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-[#00D4FF] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  硬件 U 盘 1：用户主钥匙
                </span>
                <span className="op-badge op-badge-blue">user-key.bin</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                由被继承人随身携带或锁入个人保险箱。内含 X25519 用户私钥与公钥。
              </p>
              {plan.userPublicHex && (
                <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                  公钥指纹: {plan.userPublicHex.slice(0, 28)}...
                </div>
              )}
            </div>

            <button
              onClick={() => handleDownloadFile('user')}
              className="op-btn-secondary w-full text-xs py-2"
            >
              <Download className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>下载 user-key.bin 写入用户U盘</span>
            </button>
          </div>

          {/* U盘 2: 继承人持有的副U盘 */}
          <div className="p-4 rounded-xl bg-[#0E1525] border border-purple-500/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-purple-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  硬件 U 盘 2：继承人副钥匙
                </span>
                <span className="op-badge op-badge-cyan">
                  heir-key.bin + config.bin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                由指定继承人单独妥善保管。内含继承人私钥与防篡改有效期签名配置。
              </p>
              {plan.heirPublicHex && (
                <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                  公钥指纹: {plan.heirPublicHex.slice(0, 28)}...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownloadFile('heir')}
                className="op-btn-secondary text-xs py-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>heir-key.bin</span>
              </button>
              <button
                onClick={() => handleDownloadFile('config')}
                className="op-btn-secondary text-xs py-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>config.bin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
