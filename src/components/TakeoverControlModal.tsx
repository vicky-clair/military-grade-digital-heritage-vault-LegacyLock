/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 继承人接管控制权认证弹窗 (TakeoverControlModal)
 * ============================================================================
 * 
 * 核心功能：
 * 1. 继承人通过双 U 盘免密解锁进入系统后，处于只读模式；
 * 2. 当继承人/所有者需要新增、编辑或删除资产时，必须提供「主密码 + 128位紧急安全密钥」；
 * 3. 密码学双重验证通过后，将运行模式由 HEIR_RECOVERY 提升为 OWNER 完全读写模式。
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  X,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { UsbPasswordConfig } from '../types';
import { verifyTakeoverCredentials } from '../services/cryptoService';

interface TakeoverControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  passwordConfig?: UsbPasswordConfig;
}

export const TakeoverControlModal: React.FC<TakeoverControlModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  passwordConfig,
}) => {
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim()) {
      setErrorMsg('请输入所有者设立的主密码');
      return;
    }

    if (passwordConfig?.hasSecretKey && !secretKey.trim()) {
      setErrorMsg('请输入 128 位紧急安全密钥 (Secret Key)');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyTakeoverCredentials(
        password.trim(),
        secretKey.trim(),
        passwordConfig
      );

      if (!res.success) {
        setErrorMsg(res.error || '身份验证失败：主密码或紧急安全密钥不匹配');
        setIsVerifying(false);
        return;
      }

      // 验证成功
      setIsVerifying(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMsg(err.message || '验证过程发生未知错误，请重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0F172A] shadow-2xl overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.15)',
        }}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                接管密库完全控制权
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30">
                  解除只读限制
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                双重凭证所有者授权认证 (主密码 + 紧急安全密钥)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主体表单 */}
        <form onSubmit={handleVerify} className="p-6 space-y-5">
          {/* 说明卡片 */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              当前密库处于<strong>【双 U 盘继承人只读模式】</strong>。您可以安全查阅与复制所有账号密码与凭据，但无法进行增删改操作。
              若要接管完全控制权进行修改，需验证原所有者设立的<strong>主密码</strong>与<strong>128位紧急安全密钥</strong>。
            </div>
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 凭据 1：主密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                所有者主密码 (Master Password)
              </span>
              {passwordConfig?.masterPasswordHint && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                  提示词: {passwordConfig.masterPasswordHint}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入设立密库时的所有者主密码"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 凭据 2：128位紧急安全密钥 */}
          {passwordConfig?.hasSecretKey && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  128 位紧急安全密钥 (Secret Key)
                </span>
                <span className="text-[11px] text-amber-400/80 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  见《紧急救援卡》
                </span>
              </label>
              <input
                type="text"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                placeholder="LL-XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono tracking-wider"
              />
              <p className="text-[11px] text-slate-500">
                💡 格式为 LL- 开头的 28 位军规安全字符串，记录于所有者初次设立密库时打印保存的 A4 纸质《紧急救援卡》中。
              </p>
            </div>
          )}

          {/* 底部按钮组 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              保持只读模式
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在校验军规安全凭证...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  验证并接管控制权 (启用读写)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
