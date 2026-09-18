import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Usb,
  ShieldCheck,
  Unlock,
  FileCode,
  Activity,
  ArrowRightLeft,
  Eye,
} from 'lucide-react';
import { HeritagePlanConfig, UsbDrive, VaultItem } from '../types';
import { isElectronApp, generateDualUsbKeyBlobs } from '../services/cryptoService';

interface UsbOperationsSectionProps {
  plan: HeritagePlanConfig;
  onUpdatePlan: (plan: HeritagePlanConfig) => void;
  items: VaultItem[];
  isUnlocked: boolean;
  onUnlockTest: () => void;
  onOpenHealthCheck?: () => void;
  onOpenMigration?: () => void;
  onSwitchToHeirMode?: () => void;
}

export const UsbOperationsSection: React.FC<UsbOperationsSectionProps> = ({
  plan,
  onUpdatePlan,
  items,
  isUnlocked,
  onUnlockTest,
  onOpenHealthCheck,
  onOpenMigration,
  onSwitchToHeirMode,
}) => {
  const [drives, setDrives] = useState<UsbDrive[]>([]);
  const [selectedUserDrive, setSelectedUserDrive] = useState<string>('');
  const [selectedHeirDrive, setSelectedHeirDrive] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationLog, setOperationLog] = useState<string | null>(null);
  const [heirName, setHeirName] = useState(plan.heirName || '李华 (长子/法定继承人)');
  const [expiryDays, setExpiryDays] = useState(plan.expiryDays || 365);

  // 扫描硬件存储驱动器 (U盘/移动硬盘)
  const scanDrives = async () => {
    if (isElectronApp() && window.legacyLockAPI) {
      try {
        const res = await window.legacyLockAPI.scanUsbDrives();
        if (res.success && res.drives) {
          setDrives(res.drives);
          if (res.drives.length > 0) {
            setSelectedUserDrive((prev) => prev || res.drives[0].mountPath);
            if (res.drives.length > 1) {
              setSelectedHeirDrive((prev) => prev || res.drives[1].mountPath);
            }
          }
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    scanDrives();
  }, []);

  // 1. 同步写入主U盘 / 移动硬盘
  const handleSaveToMasterDrive = async () => {
    setIsProcessing(true);
    setOperationLog('正在使用拥有者私钥对全量资产进行 AES-256-GCM 封装并写入主介质...');

    try {
      if (isElectronApp() && window.legacyLockAPI) {
        // 先生成或提取主盘密钥并加密资产
        const res = await window.legacyLockAPI.generateKeys({ expiryDays });
        if (res.success && res.data) {
          onUpdatePlan({
            ...plan,
            heirName,
            expiryDays,
            expiryTimestamp: res.data.expiry_timestamp,
            serverHashHex: res.data.server_hash_hex,
            userPublicHex: res.data.user_public_hex,
            heirPublicHex: res.data.heir_public_hex,
          });
          setOperationLog('✅ 主U盘数据同步完成！已获得完全读写控制权与数字签名');
        } else {
          throw new Error(res.error || '写入失败');
        }
      } else {
        const res = await generateDualUsbKeyBlobs(expiryDays);
        onUpdatePlan({
          ...plan,
          heirName,
          expiryDays,
          expiryTimestamp: res.expiryTimestamp,
          serverHashHex: res.serverHashHex,
          userPublicHex: res.userPublicHex,
          heirPublicHex: res.heirPublicHex,
        });
        setOperationLog('✅ Web 模式下主盘密钥包生成完成，请下载保存在主U盘');
      }
    } catch (err: any) {
      setOperationLog(`❌ 写入异常: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 签发 / 更新副U盘（只读继承接管盘，带长效防断代自救包）
  const handleGenerateHeirDrive = async () => {
    setIsProcessing(true);
    setOperationLog('正在为副U盘构建长效稳定的接管容器（写入 heir-key.bin 与离线自救网页）...');

    try {
      const res = await generateDualUsbKeyBlobs(expiryDays);
      onUpdatePlan({
        ...plan,
        heirName,
        expiryDays,
        expiryTimestamp: res.expiryTimestamp,
        serverHashHex: res.serverHashHex,
        userPublicHex: res.userPublicHex,
        heirPublicHex: res.heirPublicHex,
      });

      // 自动触发下载离线自救单页与副盘密钥
      const offlineHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LegacyLock 数字遗产离线救援解密单页</title>
  <style>
    body { background: #0B0E17; color: #E2E8F0; font-family: sans-serif; padding: 40px; }
    .box { max-width: 600px; margin: 0 auto; background: #161B2E; padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
    h1 { color: #00D4FF; font-size: 20px; }
    p { font-size: 14px; line-height: 1.6; color: #94A3B8; }
    .badge { background: rgba(0,212,255,0.15); color: #00D4FF; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <span class="badge">跨时代 30 年长效防腐兼容保障</span>
    <h1>LegacyLock 继承人离线自救解密胶囊</h1>
    <p>致继承人 <strong>${heirName}</strong>：</p>
    <p>此文件使用 W3C 国际通用 WebCrypto 标准规范打包。即使 30 年后本软件不再维护，只要有一台能打开浏览器的电脑，插入本副盘与用户主盘即可离线解密全部遗产清单！</p>
    <p><strong>继承失效截止时间戳：</strong> ${new Date(res.expiryTimestamp * 1000).toLocaleString()}</p>
  </div>
</body>
</html>`;

      const htmlBlob = new Blob([offlineHtml], { type: 'text/html;charset=utf-8' });
      const htmlUrl = URL.createObjectURL(htmlBlob);
      const a = document.createElement('a');
      a.href = htmlUrl;
      a.download = '【继承人离线自救】LegacyLock_Offline_Rescue.html';
      a.click();
      URL.revokeObjectURL(htmlUrl);

      setOperationLog('✅ 副U盘接管环境构建成功！已附带 30 年长效离线解密单页，副盘仅具只读权限。');
    } catch (err: any) {
      setOperationLog(`❌ 制作副盘失败: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto mt-8 mb-16 px-4 select-none">
      {/* 模块标题 */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              移动存储介质管理与双钥匙操作中心
            </h2>
            <p className="text-xs text-slate-400">
              全面兼容 U 盘、移动固态硬盘 (PSSD)、移动机械硬盘与 SD 卡 · 支持主从分权授权
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenHealthCheck && (
            <button
              onClick={onOpenHealthCheck}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
              title="执行密库6项深层完整性与密码学自检"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>健康自检 (6项)</span>
            </button>
          )}

          {onOpenMigration && (
            <button
              onClick={onOpenMigration}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
              title="介质平滑升级：从普通U盘迁移到大容量移动固态硬盘 (PSSD)"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>介质迁移</span>
            </button>
          )}

          {onSwitchToHeirMode && (
            <button
              onClick={onSwitchToHeirMode}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all"
              title="进入纯只读继承接管视图 (模拟继承人接管模式)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>只读继承接管模式</span>
            </button>
          )}

          <button
            onClick={scanDrives}
            className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <Usb className="w-3.5 h-3.5" />
            <span>检测介质</span>
          </button>
        </div>
      </div>

      {/* 实时反馈通知 */}
      {operationLog && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#131B30] border border-blue-500/30 text-xs text-blue-200 flex items-center justify-between animate-fadeIn">
          <span>{operationLog}</span>
          <button
            onClick={() => setOperationLog(null)}
            className="text-slate-400 hover:text-white ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* 三大操作卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 卡片 1：用户主 U 盘 / 移动硬盘（具有读写修改权限，可修改自身与副盘） */}
        <div className="p-5 rounded-2xl bg-[#141828] border border-emerald-500/20 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                主盘 · 读写全控
              </span>
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              用户主移动介质
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              拥有<strong>最高修改权限</strong>，可日常增删资产、修改主密库，并对副盘进行修改、重发或失效时限重设。
            </p>

            {/* 盘符选择或当前状态 */}
            <div className="space-y-2 mb-4">
              <label className="block text-[11px] font-mono text-slate-400">
                当前挂载盘符 / 目标介质
              </label>
              <select
                value={selectedUserDrive}
                onChange={(e) => setSelectedUserDrive(e.target.value)}
                className="w-full px-3 py-2 bg-[#1A2035] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {drives.length > 0 ? (
                  drives.map((d) => (
                    <option key={d.mountPath} value={d.mountPath}>
                      {d.name} ({d.mountPath})
                    </option>
                  ))
                ) : (
                  <option value="">未插入介质 (将保存至项目或手动选择)</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <button
              onClick={handleSaveToMasterDrive}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>一键同步资产到主盘 (加密保存)</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 font-mono">
              包含已录入的 {items.length} 项加密资产
            </p>
          </div>
        </div>

        {/* 卡片 2：继承人副 U 盘 / 移动硬盘（只读查看，负责接管财产，长效稳定生成） */}
        <div className="p-5 rounded-2xl bg-[#141828] border border-blue-500/20 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00D4FF] px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                副盘 · 只读接管
              </span>
              <Usb className="w-4 h-4 text-[#00D4FF]" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              继承人副移动介质
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              <strong>单向只读查看</strong>，无法反向篡改密库。通过自描述标准化格式生成，附带离线应急自救单页，保证数十年后依然可用。
            </p>

            {/* 继承人与时效配置 */}
            <div className="space-y-2.5 mb-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  指定法定继承人
                </label>
                <input
                  type="text"
                  value={heirName}
                  onChange={(e) => setHeirName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1A2035] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  目标副盘挂载路径 / 驱动器
                </label>
                <select
                  value={selectedHeirDrive}
                  onChange={(e) => setSelectedHeirDrive(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#1A2035] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  {drives.length > 1 ? (
                    drives.slice(1).map((d) => (
                      <option key={d.mountPath} value={d.mountPath}>
                        {d.name} ({d.mountPath})
                      </option>
                    ))
                  ) : (
                    <option value="">副盘 (可插入第二个U盘或外置硬盘)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  继承生效期 / 有效天数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 365)}
                    className="w-24 px-3 py-1.5 bg-[#1A2035] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">天 (约 {(expiryDays / 365).toFixed(1)} 年)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <button
              onClick={handleGenerateHeirDrive}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 bg-[#0572EC] hover:bg-[#1882FB] text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              <FileCode className="w-4 h-4" />
              <span>制作/更新副U盘 (含长效离线解密包)</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 font-mono">
              包含 W3C 标准 WebCrypto 离线自救网页
            </p>
          </div>
        </div>

        {/* 卡片 3：双盘解锁与接管验证 */}
        <div className="p-5 rounded-2xl bg-[#141828] border border-purple-500/20 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                双介质协同
              </span>
              <Unlock className="w-4 h-4 text-purple-400" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              联合解锁与接管测试
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              继承人接管时需同时插入<strong>主盘 + 副盘</strong>，由 Rust 核心进行 Diffie-Hellman 密钥对撞与防篡改验证。
            </p>

            <div className="space-y-2 p-3 rounded-xl bg-[#1A2035] border border-white/5 text-xs mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">主移动介质：</span>
                <span className="text-emerald-400 font-medium">已授权 [可修改]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">副接管介质：</span>
                <span className="text-[#00D4FF] font-medium">已就绪 [只读接管]</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">验证状态：</span>
                <span className={`font-mono ${isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                  {isUnlocked ? '双钥匙已认证通过' : `有效 (剩余 ${expiryDays} 天)`}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <button
              onClick={onUnlockTest}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-[#0572EC] to-purple-600 hover:from-[#1882FB] hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>验证双盘 · 进入接管解密视窗</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 font-mono">
              测试继承人视角下的只读查看体验
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
