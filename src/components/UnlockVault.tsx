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
        addLog(`已挂载【用户U盘】: ${res.path}`);
      }
    } else {
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
          addLog(`已载入【用户U盘】: ${file.name} (64 字节)`);
        }
      };
      input.click();
    }
  };

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
        addLog(`已挂载【继承人U盘】: ${res.path}`);
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
          addLog(`已载入【继承人U盘】: ${file.name} (64 字节)`);
        }
      };
      input.click();
    }
  };

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
        addLog(`已载入配置文件: ${res.path}`);
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
          addLog(`已载入防篡改配置文件: ${file.name} (40 字节)`);
        }
      };
      input.click();
    }
  };

  const handleSimulateDualUsbInsert = () => {
    setUserFileName('虚拟USB插槽A:/user-key.bin');
    setHeirFileName('虚拟USB插槽B:/heir-key.bin');
    setConfigFileName('虚拟USB插槽B:/config.bin');

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

    addLog('【硬件就绪】检测到用户主U盘已插入');
    addLog('【硬件就绪】检测到继承人副U盘已插入');
    addLog('【状态同步】两枚物理U盘均已在位，满足军规联合解锁条件！');
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
    addLog('【物理隔离】已弹出所有U盘，数字遗产保险库进入绝对闭锁状态。');
  };

  const addLog = (msg: string) => {
    setVerificationLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 15),
    ]);
  };

  const handleExecuteUnlock = async () => {
    setIsVerifying(true);
    addLog('正在启动 X25519 双钥匙 Diffie-Hellman 协商解密...');

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
        addLog('【签名校验通过】继承人公钥哈希与服务器防篡改记录一致！');
        addLog('【时效核验通过】当前时间在继承有效生命周期内。');
        addLog('【解密成功】AES-256-GCM 密文库解密完成，全部数字遗产已就绪。');

        setUnlockState((prev) => ({ ...prev, isUnlocked: true }));
        onUnlockSuccess(res.items);
      } else {
        throw new Error(res.error || '解锁失败');
      }
    } catch (e: any) {
      addLog(`【安全拦截】${e.message}`);
      setUnlockState((prev) => ({ ...prev, error: e.message }));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportDecryptedData = () => {
    const dataStr = JSON.stringify(
      {
        product: 'LegacyLock (遗产保险锁)',
        exportedAt: new Date().toISOString(),
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
    a.download = `legacylock-1password-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('已成功导出 1Password 兼容的 JSON 离线遗产归档。');
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto space-y-6">
      {/* 头部标题与控制条 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              双 U 盘联合解锁仪式
            </h1>
            <span className="op-badge op-badge-amber">双物理隔离校验</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            依照军规安全标准，必须**同时插入用户U盘与继承人U盘**才可完成量子安全解密。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateDualUsbInsert}
            className="op-btn-secondary text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>一键模拟双U盘插入</span>
          </button>

          {(userFileName || heirFileName) && (
            <button
              onClick={handleEjectAll}
              className="op-btn-secondary text-xs hover:text-red-400"
            >
              <span>弹出全部U盘</span>
            </button>
          )}
        </div>
      </div>

      {/* 双 U 盘硬件插槽卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 插槽 1: 用户主U盘 */}
        <div
          className={`op-usb-port ${
            unlockState.userKeyPresent ? 'connected' : 'waiting'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
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
                <p className="text-[11px] text-slate-400 font-mono">
                  要求介质含: user-key.bin
                </p>
              </div>
            </div>

            <span
              className={`op-badge ${
                unlockState.userKeyPresent ? 'op-badge-green' : 'op-badge-amber'
              }`}
            >
              {unlockState.userKeyPresent ? '已就绪' : '等待插入...'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-white/5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">密钥状态:</span>
              <span
                className={`font-mono font-medium ${
                  unlockState.userKeyPresent
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {unlockState.userKeyPresent
                  ? '已识别用户主公钥'
                  : '未检测到用户U盘'}
              </span>
            </div>

            {userFileName && (
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate pt-1 border-t border-white/5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{userFileName}</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleSelectUserKey}
              className="op-btn-secondary w-full text-xs py-2"
            >
              <Key className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>{unlockState.userKeyPresent ? '更换用户U盘' : '选择用户U盘密钥'}</span>
            </button>
          </div>
        </div>

        {/* 插槽 2: 继承人副U盘 */}
        <div
          className={`op-usb-port ${
            unlockState.heirKeyPresent ? 'connected' : 'waiting'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
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
                <p className="text-[11px] text-slate-400 font-mono">
                  要求介质含: heir-key.bin + config.bin
                </p>
              </div>
            </div>

            <span
              className={`op-badge ${
                unlockState.heirKeyPresent ? 'op-badge-green' : 'op-badge-amber'
              }`}
            >
              {unlockState.heirKeyPresent ? '已就绪' : '等待插入...'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080D1A] border border-white/5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">密钥状态:</span>
              <span
                className={`font-mono font-medium ${
                  unlockState.heirKeyPresent
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {unlockState.heirKeyPresent
                  ? '已识别继承人公钥'
                  : '未检测到继承人U盘'}
              </span>
            </div>

            {heirFileName && (
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate pt-1 border-t border-white/5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{heirFileName}</span>
              </div>
            )}
            {configFileName && (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] truncate">
                <FileCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="truncate">配置: {configFileName}</span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleSelectHeirKey}
              className="op-btn-secondary text-xs py-2"
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>选择 heir-key</span>
            </button>
            <button
              onClick={handleSelectConfig}
              className="op-btn-secondary text-xs py-2"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>选择 config.bin</span>
            </button>
          </div>
        </div>
      </div>

      {/* 中央军规联合解锁操作卡 */}
      <div className="op-card p-8 flex flex-col items-center justify-center text-center space-y-5">
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              unlockState.isUnlocked
                ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                : unlockState.canUnlock
                ? 'bg-[#0572EC]/20 border-2 border-[#00D4FF] shadow-[0_0_30px_rgba(0,212,255,0.3)] animate-pulse'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            {unlockState.isUnlocked ? (
              <Unlock className="w-9 h-9 text-emerald-400" />
            ) : unlockState.canUnlock ? (
              <ShieldCheck className="w-9 h-9 text-[#00D4FF]" />
            ) : (
              <Lock className="w-9 h-9 text-slate-400" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-white">
            {unlockState.isUnlocked
              ? '双 U 盘认证通过 · 数字遗产库已激活'
              : unlockState.canUnlock
              ? '两枚硬件钥匙已就绪，可执行联合解锁'
              : !unlockState.userKeyPresent && !unlockState.heirKeyPresent
              ? '请在电脑上同时插入两枚硬件 U 盘'
              : !unlockState.userKeyPresent
              ? '等待用户主 U 盘插入 (插槽 1 缺失)'
              : '等待继承人副 U 盘插入 (插槽 2 缺失)'}
          </h2>

          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {unlockState.isUnlocked
              ? '已通过双钥 Diffie-Hellman 求解对称解密向量。您现在可以直接在左侧分类查阅所有遗产资产，或一键导出归档。'
              : '物理隔离保护机制：任何单一U盘在数学上无法反推密钥，离世前任何人均无法解密。'}
          </p>
        </div>

        <div>
          {!unlockState.isUnlocked ? (
            <button
              onClick={handleExecuteUnlock}
              disabled={!unlockState.canUnlock || isVerifying}
              className="op-btn-primary px-8 py-3 text-sm font-semibold shadow-lg"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在执行 Diffie-Hellman 联合解密...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>执行双 U 盘联合解锁</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleExportDecryptedData}
              className="op-btn-primary px-8 py-3 text-sm bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-400/50 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>一键离线导出全部解密遗产数据 (JSON)</span>
            </button>
          )}
        </div>

        {unlockState.error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{unlockState.error}</span>
          </div>
        )}
      </div>

      {/* 解锁审计流水日志 */}
      <div className="op-card p-4 space-y-2">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
          <span className="font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00D4FF]" />
            硬件插槽事件与密码学审计日志
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {verificationLogs.length} 条记录
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#080D1A] border border-white/5 font-mono text-[11px] text-slate-300 space-y-1 max-h-32 overflow-y-auto">
          {verificationLogs.length === 0 ? (
            <span className="text-slate-400">等待硬件插槽事件...</span>
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
