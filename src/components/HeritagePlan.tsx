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
    plan.heirNotes || '在收到继承生效通知后，请携带本人专用的继承人U盘，前往父亲书房获取用户U盘，同时插入电脑解锁全部数字资产。'
  );
  const [expiryDays, setExpiryDays] = useState(plan.expiryDays || 365);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 一键生成双U盘军规密钥包
  const handleGenerateUsbKeys = async () => {
    setIsGenerating(true);
    setStatusMessage('正在生成 X25519 量子安全密钥对并构建双U盘镜像...');

    try {
      if (isElectronApp() && window.legacyLockAPI) {
        // Electron 原生环境下优先调用 Rust 二进制
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
          setStatusMessage('Rust 军规核心已成功生成 user-key.bin, heir-key.bin, config.bin！');
        } else {
          throw new Error(res.error || 'Rust CLI 生成密钥失败');
        }
      } else {
        // 浏览器端 WebCrypto 仿真
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
        setStatusMessage('军规双U盘密钥对已生成！您可以直接下载各U盘专用二进制文件。');
      }
    } catch (e: any) {
      setStatusMessage(`生成失败: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 触发浏览器下载单个密钥文件
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
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      {/* 头部介绍 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              数字遗产继承计划设置
            </h1>
            <span className="badge badge-cyan text-xs">军规级双钥匙模型</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            设置继承人信息与有效截止时间戳。系统将生成两枚必须同时使用的物理U盘密钥。
          </p>
        </div>

        <button
          onClick={handleGenerateUsbKeys}
          disabled={isGenerating}
          className="btn-primary"
        >
          <Usb className="w-4 h-4" />
          <span>{isGenerating ? '正在生成密钥中...' : '生成并重置双U盘密钥'}</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            generateSuccess
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 继承人资料配置 */}
        <div className="vault-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Shield className="w-4 h-4 text-[#00D4FF]" />
            <h3 className="text-sm font-bold">法定/指定继承人设定</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              继承人姓名 / 称谓
            </label>
            <input
              type="text"
              value={heirName}
              onChange={(e) => setHeirName(e.target.value)}
              className="vault-input"
              placeholder="例如: 李华 (长子)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              紧急联络信箱 / 手机号
            </label>
            <input
              type="text"
              value={heirContact}
              onChange={(e) => setHeirContact(e.target.value)}
              className="vault-input"
              placeholder="例如: heir@example.com / 138-0000-0000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              继承人离世激活指引 (操作信函)
            </label>
            <textarea
              rows={4}
              value={heirNotes}
              onChange={(e) => setHeirNotes(e.target.value)}
              className="vault-input resize-none"
              placeholder="告知继承人两枚U盘分别存放在何处..."
            />
          </div>
        </div>

        {/* 计划有效期限与失效时间戳 */}
        <div className="vault-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-200">
              <Clock className="w-4 h-4 text-[#00D4FF]" />
              <h3 className="text-sm font-bold">继承有效期限与防滥用时间戳</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                计划有效期 (天)
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="vault-input font-mono"
              >
                <option value={30}>30 天 (短期测试)</option>
                <option value={90}>90 天 (3 个月)</option>
                <option value={180}>180 天 (半年)</option>
                <option value={365}>365 天 (1 年标准期)</option>
                <option value={1095}>1095 天 (3 年长周期)</option>
                <option value={3650}>3650 天 (10 年长久期)</option>
              </select>
            </div>

            {/* 时间戳与倒计时展示卡 */}
            <div className="p-4 rounded-xl bg-[#061524] border border-[#1F2937] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">预计失效截止日期:</span>
                <span className="font-mono text-[#00D4FF] font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Unix 截止时间戳:</span>
                <span className="font-mono text-slate-200">
                  {plan.expiryTimestamp ||
                    Math.floor(Date.now() / 1000) + expiryDays * 86400}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-[#1F2937]">
                超过此截止时间后，服务器将失效并销毁对应记录，即使拥有物理U盘也无法解锁，确保不会被未授权长期滥用。
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0A2540]/40 border border-[#00D4FF]/20 flex items-start gap-2 text-xs text-slate-300">
            <Info className="w-4 h-4 text-[#00D4FF] flex-shrink-0 mt-0.5" />
            <p>
              保存修改后，请务必重新写入继承人与用户U盘，确保时间戳和公钥哈希处于同步状态。
            </p>
          </div>
        </div>
      </div>

      {/* 两个物理U盘制作与写入面板 */}
      <div className="vault-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Usb className="w-4 h-4 text-[#00D4FF]" />
              物理 U 盘制作与文件下载 (纯两个U盘模式)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              将生成的专有密钥文件分别拷入两个不同的 U 盘根目录。解锁时两根U盘必须同时插在电脑上。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* U盘 A：用户U盘 */}
          <div className="p-4 rounded-xl bg-[#061524] border border-blue-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-blue-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  U 盘 1：用户持有的主钥匙
                </span>
                <span className="badge badge-cyan text-[10px]">user-key.bin</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                由被继承人随身携带或锁入个人保险箱。内含 X25519 用户私钥与用户公钥。
              </p>
              {plan.userPublicHex && (
                <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                  公钥: {plan.userPublicHex.slice(0, 24)}...
                </div>
              )}
            </div>

            <button
              onClick={() => handleDownloadFile('user')}
              className="btn-secondary w-full justify-center text-xs py-2"
            >
              <Download className="w-3.5 h-3.5" />
              下载 user-key.bin 写入用户U盘
            </button>
          </div>

          {/* U盘 B：继承人U盘 */}
          <div className="p-4 rounded-xl bg-[#061524] border border-purple-500/30 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-purple-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  U 盘 2：继承人持有的副钥匙
                </span>
                <span className="badge badge-cyan text-[10px]">
                  heir-key.bin + config.bin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                由继承人单独保管。内含继承人私钥及附带有效时间戳的防篡改配置文件。
              </p>
              {plan.heirPublicHex && (
                <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                  公钥: {plan.heirPublicHex.slice(0, 24)}...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownloadFile('heir')}
                className="btn-secondary justify-center text-xs py-2"
              >
                <Download className="w-3.5 h-3.5" />
                heir-key.bin
              </button>
              <button
                onClick={() => handleDownloadFile('config')}
                className="btn-secondary justify-center text-xs py-2"
              >
                <Download className="w-3.5 h-3.5" />
                config.bin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
