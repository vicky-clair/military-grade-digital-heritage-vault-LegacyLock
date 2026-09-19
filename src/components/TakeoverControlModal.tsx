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
import { useI18n } from '../services/i18n';

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
  const { language } = useI18n();
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
      setErrorMsg(
        language === 'zh'
          ? '请输入所有者设立的主密码'
          : language === 'ja'
          ? '所有者のマスターパスワードを入力してください'
          : 'Please enter the Owner Master Password'
      );
      return;
    }

    if (passwordConfig?.hasSecretKey && !secretKey.trim()) {
      setErrorMsg(
        language === 'zh'
          ? '请输入 128 位紧急安全密钥 (Secret Key)'
          : language === 'ja'
          ? '128ビット緊急セキュリティキーを入力してください'
          : 'Please enter the 128-bit Emergency Secret Key'
      );
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
        setErrorMsg(
          res.error ||
            (language === 'zh'
              ? '身份验证失败：主密码或紧急安全密钥不匹配'
              : language === 'ja'
              ? '認証失敗: パスワードまたは緊急キーが一致しません'
              : 'Authentication failed: Master password or secret key does not match')
        );
        setIsVerifying(false);
        return;
      }

      // 验证成功
      setIsVerifying(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMsg(
        err.message ||
          (language === 'zh'
            ? '验证过程发生未知错误，请重试'
            : language === 'ja'
            ? 'エラーが発生しました。再試行してください'
            : 'An unexpected error occurred during verification. Please retry.')
      );
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
                {language === 'zh' ? '接管密库完全控制权' : language === 'ja' ? '金庫の完全制御を引き継ぐ' : 'Takeover Full Vault Control'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30">
                  {language === 'zh' ? '解除只读限制' : language === 'ja' ? '読み取り専用を解除' : 'Lift Read-Only'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'zh' ? '双重凭证所有者授权认证 (主密码 + 紧急安全密钥)' : language === 'ja' ? '二重認証 (マスターパスワード + 緊急セキュリティキー)' : 'Dual-Credential Owner Authorization (Master Password + Secret Key)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={language === 'zh' ? '关闭' : language === 'ja' ? '閉じる' : 'Close'}
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
              {language === 'zh' ? (
                <>
                  当前密库处于<strong>【双 U 盘继承人只读模式】</strong>。您可以安全查阅与复制所有账号密码与凭据，但无法进行增删改操作。
                  若要接管完全控制权进行修改，需验证原所有者设立的<strong>主密码</strong>与<strong>128位紧急安全密钥</strong>。
                </>
              ) : language === 'ja' ? (
                <>
                  現在金庫は<strong>【デュアルUSB継承者読み取り専用モード】</strong>です。すべての認証情報を閲覧・コピーできますが、編集・追加・削除はできません。
                  完全な書き込み権限を引き継ぐには、所有者の<strong>マスターパスワード</strong>と<strong>128ビット緊急セキュリティキー</strong>の認証が必要です。
                </>
              ) : (
                <>
                  The vault is currently in <strong>[Dual-USB Heir Read-Only Mode]</strong>. You can view and copy credentials, but cannot create, edit, or delete items.
                  To take over write permissions, please verify the original owner's <strong>Master Password</strong> and <strong>128-bit Emergency Secret Key</strong>.
                </>
              )}
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
                {language === 'zh' ? '所有者主密码 (Master Password)' : language === 'ja' ? '所有者マスターパスワード (Master Password)' : 'Owner Master Password'}
              </span>
              {passwordConfig?.masterPasswordHint && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                  {language === 'zh' ? '提示词: ' : language === 'ja' ? 'ヒント: ' : 'Hint: '}{passwordConfig.masterPasswordHint}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === 'zh' ? '请输入设立密库时的所有者主密码' : language === 'ja' ? '金庫設定時のマスターパスワードを入力' : 'Enter the Owner Master Password'}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPassword ? (language === 'zh' ? '隐藏明文' : language === 'ja' ? '非表示' : 'Hide') : (language === 'zh' ? '显示明文' : language === 'ja' ? '表示' : 'Show')}
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
                  {language === 'zh' ? '128 位紧急安全密钥 (Secret Key)' : language === 'ja' ? '128ビット緊急セキュリティキー (Secret Key)' : '128-bit Emergency Secret Key'}
                </span>
                <span className="text-[11px] text-amber-400/80 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {language === 'zh' ? '见《紧急救援卡》' : language === 'ja' ? '「緊急救援カード」参照' : 'See Emergency Kit'}
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
                {language === 'zh'
                  ? '💡 格式为 LL- 开头的 28 位军规安全字符串，记录于所有者初次设立密库时打印保存的 A4 纸质《紧急救援卡》中。'
                  : language === 'ja'
                  ? '💡 形式は LL- で始まる28桁の文字列で、所有者が金庫作成時に印刷保管した紙の「緊急救援カード」に記載されています。'
                  : '💡 A 28-character security token starting with "LL-", documented in the printed A4 Emergency Kit.'}
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
              {language === 'zh' ? '保持只读模式' : language === 'ja' ? '読み取り専用のままにする' : 'Keep Read-Only'}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {language === 'zh' ? '正在校验军规安全凭证...' : language === 'ja' ? '認証情報を検証中...' : 'Verifying Credentials...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'zh' ? '验证并接管控制权 (启用读写)' : language === 'ja' ? '検証して権限を引き継ぐ (読み書き有効化)' : 'Verify & Takeover Control (Enable Write)'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
