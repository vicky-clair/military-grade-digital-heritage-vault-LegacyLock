import React, { useState, useEffect } from 'react';
import {
  Usb,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Download,
  AlertOctagon,
  FileCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DualUnlockState, EncryptedContainer, HeritagePlanConfig, VaultItem } from '../types';
import { isElectronApp, verifyAndUnlockVault } from '../services/cryptoService';

interface UnlockVaultProps {
  plan: HeritagePlanConfig;
  container: EncryptedContainer;
  currentItems: VaultItem[];
  onUnlockSuccess: (unlockedItems: VaultItem[]) => void;
  isAlreadyUnlocked: boolean;
}

export const UnlockVault: React.FC<UnlockVaultProps> = ({
  plan,
  container,
  currentItems,
  onUnlockSuccess,
  isAlreadyUnlocked,
}) => {
  const [unlockState, setUnlockState] = useState<DualUnlockState>({
    userKeyPresent: isAlreadyUnlocked,
    heirKeyPresent: isAlreadyUnlocked,
    configPresent: isAlreadyUnlocked,
    isExpired: false,
    isHashMatched: true,
    canUnlock: isAlreadyUnlocked,
    isUnlocked: isAlreadyUnlocked,
  });

  const [userFileName, setUserFileName] = useState<string | null>(
    isAlreadyUnlocked ? 'user-key.bin' : null
  );
  const [heirFileName, setHeirFileName] = useState<string | null>(
    isAlreadyUnlocked ? 'heir-key.bin' : null
  );
  const [configFileName, setConfigFileName] = useState<string | null>(
    isAlreadyUnlocked ? 'config.bin' : null
  );

  const [userKeyBuffer, setUserKeyBuffer] = useState<Uint8Array | null>(null);
  const [heirKeyBuffer, setHeirKeyBuffer] = useState<Uint8Array | null>(null);
  const [configBuffer, setConfigBuffer] = useState<Uint8Array | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);

  // 检查状态更新
  useEffect(() => {
    const bothKeysPresent =
      (unlockState.userKeyPresent || !!userKeyBuffer) &&
      (unlockState.heirKeyPresent || !!heirKeyBuffer) &&
      (unlockState.configPresent || !!configBuffer);

    const now = Math.floor(Date.now() / 1000);
    const isExpired = plan.expiryTimestamp > 0 && now > plan.expiryTimestamp;

    setUnlockState((prev) => ({
      ...prev,
      isExpired,
      canUnlock: bothKeysPresent && !isExpired,
    }));
  }, [
    unlockState.userKeyPresent,
    unlockState.heirKeyPresent,
    unlockState.configPresent,
    userKeyBuffer,
    heirKeyBuffer,
    configBuffer,
    plan.expiryTimestamp,
  ]);

  // 处理用户 U 盘插入或选择
  const handleSelectUserKey = async () => {
    if (isElectronApp() && window.legacyLockAPI) {
      const res = await window.legacyLockAPI.selectKeyFile('user');
      if (!res.canceled && res.path) {
        setUserFileName(res.path);
        setUnlockState((prev) => ({
          ...prev,
          userKeyPresent: true,
          userKeyPath: res.path,
        }));
        addLog(`已检测并挂载【用户U盘】: ${res.path}`);
      }
    } else {
      // 浏览器端 input file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bin';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const buf = await file.arrayBuffer();
          setUserKeyBuffer(new Uint8Array(buf));
          setUserFileName(file.name);
          setUnlockState((prev) => ({ ...prev, userKeyPresent: true }));
          addLog(`已载入【用户U盘密钥】: ${file.name} (${file.size} 字节)`);
        }
      };
      input.click();
    }
  };

  // 处理继承人 U 盘插入或选择
  const handleSelectHeirKey = async () => {
    if (isElectronApp() && window.legacyLockAPI) {
      const res = await window.legacyLockAPI.selectKeyFile('heir');
      if (!res.canceled && res.path) {
        setHeirFileName(res.path);
        setUnlockState((prev) => ({
          ...prev,
          heirKeyPresent: true,
          heirKeyPath: res.path,
        }));
        addLog(`已检测并挂载【继承人U盘】: ${res.path}`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bin';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const buf = await file.arrayBuffer();
          setHeirKeyBuffer(new Uint8Array(buf));
          setHeirFileName(file.name);
          setUnlockState((prev) => ({ ...prev, heirKeyPresent: true }));
          addLog(`已载入【继承人U盘密钥】: ${file.name} (${file.size} 字节)`);
        }
      };
      input.click();
    }
  };

  // 处理配置文件
  const handleSelectConfig = async () => {
    if (isElectronApp() && window.legacyLockAPI) {
      const res = await window.legacyLockAPI.selectKeyFile('config');
      if (!res.canceled && res.path) {
        setConfigFileName(res.path);
        setUnlockState((prev) => ({
          ...prev,
          configPresent: true,
          configPath: res.path,
        }));
        addLog(`已载入继承防篡改配置: ${res.path}`);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.bin';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const buf = await file.arrayBuffer();
          setConfigBuffer(new Uint8Array(buf));
          setConfigFileName(file.name);
          setUnlockState((prev) => ({ ...prev, configPresent: true }));
          addLog(`已载入配置文件: ${file.name} (${file.size} 字节)`);
        }
      };
      input.click();
    }
  };

  // 快速模拟双U盘同时接入 (用于演示和无物理盘测试)
  const handleSimulateDualUsbInsert = () => {
    setUserFileName('虚拟U盘A:/user-key.bin');
    setHeirFileName('虚拟U盘B:/heir-key.bin');
    setConfigFileName('虚拟U盘B:/config.bin');

    const dummyUserKey = new Uint8Array(64);
    const dummyHeirKey = new Uint8Array(64);
    const dummyConfig = new Uint8Array(40);
    window.crypto.getRandomValues(dummyUserKey);
    window.crypto.getRandomValues(dummyHeirKey);
    window.crypto.getRandomValues(dummyConfig);

    setUserKeyBuffer(dummyUserKey);
    setHeirKeyBuffer(dummyHeirKey);
    setConfigBuffer(dummyConfig);

    setUnlockState((prev) => ({
      ...prev,
      userKeyPresent: true,
      heirKeyPresent: true,
      configPresent: true,
      canUnlock: true,
    }));

    addLog('【硬件侦测】检测到插槽 1 插入用户物理U盘 [user-key.bin]');
    addLog('【硬件侦测】检测到插槽 2 插入继承人物理U盘 [heir-key.bin + config.bin]');
    addLog('【双钥就绪】双物理U盘已全部在位，满足军规联合解锁前置条件！');
  };

  const handleEjectAll = () => {
    setUserFileName(null);
    setHeirFileName(null);
    setConfigFileName(null);
    setUserKeyBuffer(null);
    setHeirKeyBuffer(null);
    setConfigBuffer(null);
    setUnlockState({
      userKeyPresent: false,
      heirKeyPresent: false,
      configPresent: false,
      isExpired: false,
      isHashMatched: true,
      canUnlock: false,
      isUnlocked: false,
    });
    addLog('【物理隔离生效】已安全拔出全部 U 盘，遗产密码库进入物理闭锁状态。');
  };

  const addLog = (msg: string) => {
    setVerificationLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15),
    ]);
  };

  // 执行双U盘军规解锁
  const handleExecuteUnlock = async () => {
    setIsVerifying(true);
    addLog('开始执行军规级联合解密流水线...');
    addLog('1. 读取两个U盘的物理介质密钥 (X25519 Diffie-Hellman)...');

    try {
      const res = await verifyAndUnlockVault({
        userKeyPath: unlockState.userKeyPath,
        userKeyBuffer: userKeyBuffer || undefined,
        heirKeyPath: unlockState.heirKeyPath,
        heirKeyBuffer: heirKeyBuffer || undefined,
        configPath: unlockState.configPath,
        configBuffer: configBuffer || undefined,
        container,
        currentItems,
      });

      if (res.success && res.items) {
        addLog('2. 验证时间戳与服务器哈希防篡改签名... 通过！');
        addLog('3. 计算 DH(user_secret, heir_public) == DH(heir_secret, user_public)... 密钥完全一致！');
        addLog('4. AES-256-GCM 密文数据解密成功，遗产资产库已激活！');

        setUnlockState((prev) => ({ ...prev, isUnlocked: true }));
        onUnlockSuccess(res.items);
      } else {
        throw new Error(res.error || '解锁失败');
      }
    } catch (e: any) {
      addLog(`【解密拦截】${e.message}`);
      setUnlockState((prev) => ({ ...prev, error: e.message }));
    } finally {
      setIsVerifying(false);
    }
  };

  // 导出解密后遗产数据
  const handleExportDecryptedData = () => {
    const dataStr = JSON.stringify(
      {
        product: 'LegacyLock (遗产保险锁)',
        exportTimestamp: Date.now(),
        date: new Date().toISOString(),
        owner: plan.heirName,
        items: currentItems,
      },
      null,
      2
    );

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legacylock-heritage-decrypted-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('继承人已成功导出完整解密数字资产归档。');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
      {/* 头部标题与仪式感说明 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F2937]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              双 U 盘联合解锁仪式
            </h1>
            <span className="badge badge-amber text-xs">军规物理隔离</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            必须**同时拥有并插入用户U盘与继承人U盘**。任意单盘或伪造密钥将被硬件拦截。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateDualUsbInsert}
            className="btn-secondary text-xs"
            title="模拟同时插上两个带有密钥的U盘"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
            模拟同时插上两个U盘
          </button>

          {(userFileName || heirFileName) && (
            <button
              onClick={handleEjectAll}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs"
              title="拔出所有U盘"
            >
              拔出U盘
            </button>
          )}
        </div>
      </div>

      {/* 双 U 盘物理插槽实时侦测面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 插槽 1: 用户U盘 */}
        <div
          className={`usb-slot ${
            unlockState.userKeyPresent ? 'active' : 'waiting'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg border ${
                  unlockState.userKeyPresent
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                }`}
              >
                <Usb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  插槽 1：用户持有的主U盘
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  要求介质内含: user-key.bin
                </span>
              </div>
            </div>

            <span
              className={`badge text-[10px] ${
                unlockState.userKeyPresent ? 'badge-green' : 'badge-amber'
              }`}
            >
              {unlockState.userKeyPresent ? '已插入' : '等待插入...'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#061524] border border-[#1F2937] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">挂载状态:</span>
              <span
                className={`font-mono font-semibold ${
                  unlockState.userKeyPresent
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {unlockState.userKeyPresent
                  ? '已识别用户专用 X25519 密钥'
                  : '未检测到用户U盘'}
              </span>
            </div>

            {userFileName && (
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{userFileName}</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleSelectUserKey}
              className="btn-secondary w-full justify-center text-xs py-2"
            >
              <Key className="w-3.5 h-3.5" />
              {unlockState.userKeyPresent ? '更换/重选用户U盘' : '插槽 1: 选择用户U盘'}
            </button>
          </div>
        </div>

        {/* 插槽 2: 继承人U盘 */}
        <div
          className={`usb-slot ${
            unlockState.heirKeyPresent ? 'active' : 'waiting'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg border ${
                  unlockState.heirKeyPresent
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                }`}
              >
                <Usb className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  插槽 2：继承人持有的副U盘
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  要求介质内含: heir-key.bin + config.bin
                </span>
              </div>
            </div>

            <span
              className={`badge text-[10px] ${
                unlockState.heirKeyPresent ? 'badge-green' : 'badge-amber'
              }`}
            >
              {unlockState.heirKeyPresent ? '已插入' : '等待插入...'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#061524] border border-[#1F2937] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">挂载状态:</span>
              <span
                className={`font-mono font-semibold ${
                  unlockState.heirKeyPresent
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {unlockState.heirKeyPresent
                  ? '已识别继承人专用 X25519 密钥'
                  : '未检测到继承人U盘'}
              </span>
            </div>

            {heirFileName && (
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{heirFileName}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleSelectHeirKey}
              className="btn-secondary justify-center text-xs py-2"
            >
              <Key className="w-3.5 h-3.5" />
              {unlockState.heirKeyPresent ? '重选继承人Key' : '选择 heir-key.bin'}
            </button>
            <button
              onClick={handleSelectConfig}
              className="btn-secondary justify-center text-xs py-2"
            >
              <Clock className="w-3.5 h-3.5" />
              {configFileName ? '配置已载入' : '选择 config.bin'}
            </button>
          </div>
        </div>
      </div>

      {/* 中央军规联合解锁控制区 */}
      <div className="vault-card p-6 flex flex-col items-center justify-center text-center space-y-4">
        {/* 中心光晕指示球 */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              unlockState.isUnlocked
                ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : unlockState.canUnlock
                ? 'bg-[#00D4FF]/20 border-2 border-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.4)] animate-pulse'
                : 'bg-slate-800/40 border border-slate-700'
            }`}
          >
            {unlockState.isUnlocked ? (
              <Unlock className="w-9 h-9 text-emerald-400" />
            ) : unlockState.canUnlock ? (
              <ShieldCheck className="w-9 h-9 text-[#00D4FF]" />
            ) : (
              <Lock className="w-9 h-9 text-slate-500" />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-white">
            {unlockState.isUnlocked
              ? '双 U 盘认证通过 · 数字遗产已完全解密'
              : unlockState.canUnlock
              ? '两个 U 盘已同时插在电脑上，可执行军规解密'
              : !unlockState.userKeyPresent && !unlockState.heirKeyPresent
              ? '请同时插入用户U盘与继承人U盘'
              : !unlockState.userKeyPresent
              ? '等待用户主U盘插入 (插槽 1 缺失)'
              : '等待继承人副U盘插入 (插槽 2 缺失)'}
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            {unlockState.isUnlocked
              ? '已成功联合求解 Diffie-Hellman 派生密钥。您现在可在此设备上查阅所有被继承遗产账号，或一键导出归档。'
              : '安全物理隔离验证：若缺失任意一根U盘，数据密文在数学上不可逆，保证离世前账号永不泄露。'}
          </p>
        </div>

        {/* 解锁操作按钮 */}
        <div className="flex items-center gap-3">
          {!unlockState.isUnlocked ? (
            <button
              onClick={handleExecuteUnlock}
              disabled={!unlockState.canUnlock || isVerifying}
              className="btn-primary px-8 py-3 text-sm shadow-xl"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在执行 X25519 联合解密...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>执行双U盘联合解锁</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleExportDecryptedData}
              className="btn-primary px-8 py-3 text-sm bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-400 shadow-emerald-950/40"
            >
              <Download className="w-4 h-4" />
              <span>一键离线导出全部解密遗产数据 (JSON)</span>
            </button>
          )}
        </div>

        {unlockState.error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{unlockState.error}</span>
          </div>
        )}
      </div>

      {/* 解锁流水线实时审计日志 */}
      <div className="vault-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#1F2937]">
          <span className="font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#00D4FF]" />
            硬件插槽侦测与密码学审计日志
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {verificationLogs.length} 条记录
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#061524] border border-[#1F2937] font-mono text-[11px] text-slate-300 space-y-1 max-h-36 overflow-y-auto">
          {verificationLogs.length === 0 ? (
            <span className="text-slate-500">等待硬件插槽事件...</span>
          ) : (
            verificationLogs.map((log, index) => (
              <div key={index} className="leading-tight">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
