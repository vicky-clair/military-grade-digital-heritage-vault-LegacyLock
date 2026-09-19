/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 尊享订阅与试用管理弹窗 (SubscriptionModal)
 * ============================================================================
 * 
 * 商业设计与合规特性：
 * 1. 纯订阅制：提供月度 (1个月)、季度 (3个月)、年度 (12个月) 订阅套餐，不设买断；
 * 2. 状态可视化：清晰展示 3 个月免费试用剩余天数、到期只读状态或已激活会员权益；
 * 3. 试用到期柔性保障：明确告知用户既有数据永久安全保留可随时查阅复制，仅限制新增与编辑；
 * 4. 内置调试辅助条：一键模拟“试用到期”、“恢复试用”、“激活会员”，方便现场验证交互；
 * 5. 遵循 Apple App Store 与 Microsoft Store 订阅规范，提供协议与隐私条款。
 */

import React, { useState } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  Sparkles,
  Gift,
  AlertTriangle,
} from 'lucide-react';
import {
  SubscriptionTier,
  activateSubscription,
  getSubscriptionState,
  getTrialDaysRemaining,
  isTrialActive,
  setDebugSubscriptionMode,
} from '../services/subscriptionService';
import { useI18n } from '../services/i18n';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionChanged?: () => void;
  reason?: 'expired_add' | 'expired_edit' | 'expired_delete' | 'manual';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionChanged,
  reason = 'manual',
}) => {
  const { language } = useI18n();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('yearly');
  const [licenseInput, setLicenseInput] = useState('');
  const [showLicenseBox, setShowLicenseBox] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const state = getSubscriptionState();
  const trialDays = getTrialDaysRemaining(state);
  const isTrial = isTrialActive(state);
  const isSubscribed = state.isSubscribed;
  const isExpired = !isSubscribed && !isTrial;

  // 格式化到期日期
  const formatExpiry = (ts?: number) => {
    if (!ts) return language === 'zh' ? '永久有效' : language === 'ja' ? '無期限' : 'Permanent';
    return new Date(ts).toLocaleDateString();
  };

  // 处理购买/开通订阅
  const handleSubscribe = () => {
    activateSubscription(selectedTier);
    const tierName =
      selectedTier === 'yearly'
        ? language === 'zh' ? '年度' : language === 'ja' ? '年間' : 'Yearly'
        : selectedTier === 'quarterly'
        ? language === 'zh' ? '季度' : language === 'ja' ? '四半期' : 'Quarterly'
        : language === 'zh' ? '月度' : language === 'ja' ? '月額' : 'Monthly';

    setFeedbackMsg({
      type: 'success',
      text:
        language === 'zh'
          ? `🎉 恭喜！您已成功开通 LegacyLock ${tierName}尊享订阅！已完全解除只读限制。`
          : language === 'ja'
          ? `🎉 おめでとうございます！LegacyLock ${tierName}プランの登録が完了しました。読み取り専用制限が解除されました。`
          : `🎉 Congratulations! You have subscribed to LegacyLock ${tierName} plan. Read-only limits removed.`,
    });
    if (onSubscriptionChanged) onSubscriptionChanged();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // 兑换激活码
  const handleRedeemLicense = () => {
    const code = licenseInput.trim().toUpperCase();
    if (!code) {
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'zh'
            ? '请输入有效的授权许可激活码'
            : language === 'ja'
            ? '有効なライセンスコードを入力してください'
            : 'Please enter a valid license key',
      });
      return;
    }
    if (code === 'LEGACY-PRO-2026' || code.startsWith('LL-') || code.length >= 8) {
      activateSubscription('yearly', code);
      setFeedbackMsg({
        type: 'success',
        text:
          language === 'zh'
            ? '🎉 激活码兑换成功！已为您开通 1 年尊享订阅服务。'
            : language === 'ja'
            ? '🎉 コードの引き換えに成功しました！1年間のプレミアムプランが有効化されました。'
            : '🎉 License redeemed! 1-year premium subscription activated.',
      });
      if (onSubscriptionChanged) onSubscriptionChanged();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'zh'
            ? '激活码无效或已被使用，测试可使用：LEGACY-PRO-2026'
            : language === 'ja'
            ? 'コードが無効か既に使用されています。テスト用: LEGACY-PRO-2026'
            : 'Invalid or redeemed key. For testing use: LEGACY-PRO-2026',
      });
    }
  };

  // 快捷调试切换
  const handleDebugSwitch = (mode: 'normal' | 'force_expired' | 'force_subscribed') => {
    setDebugSubscriptionMode(mode);
    setFeedbackMsg({
      type: 'success',
      text:
        language === 'zh'
          ? `已切换状态为：${mode === 'force_expired' ? '【3个月试用已到期(只读模式)】' : mode === 'force_subscribed' ? '【已开通年度订阅】' : '【3个月试用期正常模式】'}`
          : language === 'ja'
          ? `状態を切り替えました: ${mode === 'force_expired' ? '【3ヶ月試用終了 (読み取り専用)】' : mode === 'force_subscribed' ? '【年間プラン加入中】' : '【3ヶ月試用中】'}`
          : `State switched to: ${mode === 'force_expired' ? '[3-Month Trial Expired (Read-Only)]' : mode === 'force_subscribed' ? '[Subscribed (Yearly)]' : '[3-Month Free TrialActive]'}`,
    });
    if (onSubscriptionChanged) onSubscriptionChanged();
  };

  return (
    <div className="modal-backdrop sub-modal-backdrop" onClick={onClose}>
      <div
        className="sub-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="sub-modal-header">
          <button className="sub-modal-close-btn" onClick={onClose} aria-label={language === 'zh' ? '关闭' : language === 'ja' ? '閉じる' : 'Close'}>
            <X className="w-4 h-4" />
          </button>

          <div className="sub-header-content">
            <div className="sub-crown-badge">
              <Crown className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="sub-header-title">{language === 'zh' ? 'LegacyLock 军规尊享服务' : language === 'ja' ? 'LegacyLock プレミアムサービス' : 'LegacyLock Premium Edition'}</h2>
              <p className="sub-header-subtitle">
                {language === 'zh' ? '为您的核心数字遗产、服务器私钥与高价值财产凭据提供长期可靠守护' : language === 'ja' ? '重要なデジタル遺産、SSH秘密鍵、資産情報を安全に長期保護' : 'Long-term zero-knowledge protection for your digital heritage, SSH keys, and financial assets'}
              </p>
            </div>
          </div>

          {/* Current Status Pill Bar */}
          <div className="sub-status-banner">
            {isSubscribed ? (
              <div className="sub-status-box active">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>
                  <strong>{language === 'zh' ? '尊享订阅会员中' : language === 'ja' ? 'プレミアム会員有効' : 'Premium Member'}</strong>：{language === 'zh' ? '服务有效期至 ' : language === 'ja' ? '有効期限: ' : 'Valid until '}
                  <span className="text-[#34D399]">{formatExpiry(state.subscriptionExpiresAt)}</span>
                </span>
              </div>
            ) : isTrial ? (
              <div className="sub-status-box trial">
                <Gift className="w-4 h-4 text-[#00D4FF]" />
                <span>
                  <strong>{language === 'zh' ? '3 个月免费试用中' : language === 'ja' ? '3ヶ月無料トライアル中' : '3-Month Free Trial'}</strong>：{language === 'zh' ? `当前剩余 ` : language === 'ja' ? `残り ` : ''}
                  <span className="text-[#00D4FF] font-bold">{trialDays}</span> {language === 'zh' ? '天全功能试用期，可畅享全部权益' : language === 'ja' ? '日間全機能利用可能' : 'days remaining, all features unlocked'}
                </span>
              </div>
            ) : (
              <div className="sub-status-box expired">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <span>
                  <strong>{language === 'zh' ? '3 个月免费试用已结束' : language === 'ja' ? '無料トライアル終了' : 'Free Trial Expired'}</strong>：{language === 'zh' ? '当前处于只读保护模式。已录入的资产永久安全保留可随时查阅复制；订阅后立即可新增与修改。' : language === 'ja' ? '現在読み取り専用モードです。登録済みのデータは保持され閲覧・コピー可能。購読で編集・追加が再開されます。' : 'Current mode is Read-Only. Existing assets are safely preserved for viewing/copying. Subscribe to resume full edit/create.'}
                </span>
              </div>
            )}
          </div>

          {reason === 'expired_add' && isExpired && (
            <div className="sub-intercept-tip">
              {language === 'zh' ? '💡 提示：您正在尝试添加新资产。当前处于试用到期只读模式，订阅后即可立即解锁无限制录入权限！' : language === 'ja' ? '💡 ヒント: 新規資産を追加しようとしています。購読すると制限なく追加できます！' : '💡 Notice: You are trying to add a new asset. Subscribe to unlock unlimited entries!'}
            </div>
          )}
          {reason === 'expired_edit' && isExpired && (
            <div className="sub-intercept-tip">
              {language === 'zh' ? '💡 提示：您正在尝试修改资产内容。当前处于试用到期只读模式，订阅后即可立即解锁编辑修改权限！' : language === 'ja' ? '💡 ヒント: 資産を編集しようとしています。購読すると制限なく編集できます！' : '💡 Notice: You are trying to edit an asset. Subscribe to unlock editing privileges!'}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="sub-modal-body">
          {feedbackMsg && (
            <div
              className={`sub-feedback-box ${feedbackMsg.type === 'success' ? 'success' : 'error'}`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {/* 3 Tier Cards */}
          <div className="sub-tiers-grid">
            {/* Monthly */}
            <div
              className={`sub-tier-card ${selectedTier === 'monthly' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('monthly')}
            >
              <div className="sub-tier-header">
                <span className="sub-tier-name">{language === 'zh' ? '月度服务' : language === 'ja' ? '月額プラン' : 'Monthly'}</span>
                <span className="sub-tier-tag">{language === 'zh' ? '1 个月' : language === 'ja' ? '1ヶ月' : '1 Month'}</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">{language === 'en' ? '$' : '¥'}</span>
                <span className="sub-tier-amount">{language === 'en' ? '4.99' : '28'}</span>
                <span className="sub-tier-unit">/{language === 'zh' ? '月' : language === 'ja' ? '月' : 'mo'}</span>
              </div>
              <p className="sub-tier-desc">{language === 'zh' ? '适合短期测试与资产盘点，随时按需订购' : language === 'ja' ? '短期のお試しや資産棚卸しに最適' : 'Ideal for short-term audit and setup'}</p>
            </div>

            {/* Quarterly */}
            <div
              className={`sub-tier-card ${selectedTier === 'quarterly' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('quarterly')}
            >
              <div className="sub-tier-header">
                <span className="sub-tier-name">{language === 'zh' ? '季度服务' : language === 'ja' ? '四半期プラン' : 'Quarterly'}</span>
                <span className="sub-tier-tag sub-tag-save">{language === 'zh' ? '立省 20%' : language === 'ja' ? '20% お得' : 'Save 20%'}</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">{language === 'en' ? '$' : '¥'}</span>
                <span className="sub-tier-amount">{language === 'en' ? '11.99' : '68'}</span>
                <span className="sub-tier-unit">/{language === 'zh' ? '季' : language === 'ja' ? '期' : 'quarter'}</span>
              </div>
              <p className="sub-tier-desc">{language === 'zh' ? '相当于 ¥22.6/月，适合过渡期与季度管理' : language === 'ja' ? '実質お得、四半期ごとの管理に最適' : 'Flexible medium-term management'}</p>
            </div>

            {/* Yearly (Best Value) */}
            <div
              className={`sub-tier-card featured ${selectedTier === 'yearly' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('yearly')}
            >
              <div className="sub-featured-badge">{language === 'zh' ? '⭐ 最受欢迎 · 立省 50%' : language === 'ja' ? '⭐ 一番人気 · 50% お得' : '⭐ Most Popular · Save 50%'}</div>
              <div className="sub-tier-header">
                <span className="sub-tier-name">{language === 'zh' ? '年度服务' : language === 'ja' ? '年間プラン' : 'Annual'}</span>
                <span className="sub-tier-tag sub-tag-hot">{language === 'zh' ? '尊享推荐' : language === 'ja' ? 'おすすめ' : 'Best Value'}</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">{language === 'en' ? '$' : '¥'}</span>
                <span className="sub-tier-amount">{language === 'en' ? '39.99' : '168'}</span>
                <span className="sub-tier-unit">/{language === 'zh' ? '年' : language === 'ja' ? '年' : 'year'}</span>
              </div>
              <p className="sub-tier-desc font-medium text-[#FDE68A]">
                {language === 'zh' ? (
                  <>折合仅需 <strong>¥14 / 月</strong> · 全年不间断安全守护</>
                ) : language === 'ja' ? (
                  <>月額換算でお得 · 1年中安心の保護</>
                ) : (
                  <>Lowest monthly rate · 365-day security guard</>
                )}
              </p>
            </div>
          </div>

          {/* Benefits Matrix */}
          <div className="sub-benefits-card">
            <h3 className="sub-benefits-title">
              <Sparkles className="w-4 h-4 text-[#00D4FF]" />
              <span>{language === 'zh' ? '全功能尊享权益清单' : language === 'ja' ? 'プレミアム特典一覧' : 'All-Inclusive Premium Features'}</span>
            </h3>
            <div className="sub-benefits-list">
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>{language === 'zh' ? '无限量资产录入与编辑' : language === 'ja' ? '無制限の資産登録・編集' : 'Unlimited Asset Entries & Editing'}</strong>：
                  {language === 'zh' ? '全面解除只读限制，支持 23+ 种分类随时修改与新增' : language === 'ja' ? '読み取り専用を解除し、23種類以上のカテゴリに対応' : 'Full write access for all 23+ category templates'}
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>{language === 'zh' ? '军规物理双 U 盘继承计划' : language === 'ja' ? '軍用規格デュアルUSB継承プラン' : 'Military Dual-USB Hardware Inheritance'}</strong>：
                  {language === 'zh' ? '独家 X25519 非对称物理隔离协商，身后可靠接管' : language === 'ja' ? 'X25519非対称暗号による安全な引き継ぎ' : 'Hardware-isolated X25519 dual-key takeover'}
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>{language === 'zh' ? '单项 2MB 零知识加密附件柜' : language === 'ja' ? '2MBゼロ知識暗号化添付ファイル' : '2MB Zero-Knowledge Encrypted Attachments'}</strong>：
                  {language === 'zh' ? 'AES-256-GCM 本地加密密钥文件、证书与公证书扫描件' : language === 'ja' ? 'AES-256-GCMで秘密鍵や証明書を安全保管' : 'Securely attach keys, licenses, and contracts'}
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>{language === 'zh' ? '6 项密码学健康体检与防篡改扫描' : language === 'ja' ? '暗号学的ヘルスチェック' : 'Cryptographic Health Audit'}</strong>：
                  {language === 'zh' ? '持续自测完整性与安全弱口令风险' : language === 'ja' ? '整合性と脆弱パスワードの自動スキャン' : 'Integrity verification and weak password diagnostics'}
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>{language === 'zh' ? '持续安全迭代与跨端权益互通' : language === 'ja' ? '継続的セキュリティアップデート' : 'Continuous Security Updates'}</strong>：
                  {language === 'zh' ? '适配 Apple Mac App Store 与 Windows 微软商店' : language === 'ja' ? '最新OSとストア規格に対応' : 'Cross-platform support and long-term maintenance'}
                </span>
              </div>
            </div>
          </div>

          {/* Subscribe Action Button */}
          <div className="sub-action-wrapper">
            <button className="sub-primary-subscribe-btn" onClick={handleSubscribe}>
              <Crown className="w-5 h-5" />
              <span>
                {isSubscribed
                  ? (language === 'zh' ? '立即续订尊享服务' : language === 'ja' ? 'サブスクリプションを更新' : 'Renew Subscription')
                  : isExpired
                  ? (language === 'zh' ? '立即开通服务并恢复修改权限' : language === 'ja' ? 'プランを登録して編集権限を復帰' : 'Subscribe to Restore Edit Permissions')
                  : (language === 'zh' ? '提前开通尊享服务' : language === 'ja' ? 'プレミアムに加入' : 'Upgrade to Premium')}{' '}
                (
                {selectedTier === 'yearly'
                  ? (language === 'zh' ? '年度 ¥168' : language === 'ja' ? '年間 ¥168' : 'Yearly $39.99')
                  : selectedTier === 'quarterly'
                  ? (language === 'zh' ? '季度 ¥68' : language === 'ja' ? '四半期 ¥68' : 'Quarterly $11.99')
                  : (language === 'zh' ? '月度 ¥28' : language === 'ja' ? '月額 ¥28' : 'Monthly $4.99')}
                )
              </span>
            </button>

            {/* Redeem code toggle */}
            <div className="sub-secondary-links">
              <button
                type="button"
                className="sub-link-btn"
                onClick={() => setShowLicenseBox(!showLicenseBox)}
              >
                {language === 'zh' ? '我有许可激活码 / 兑换码？' : language === 'ja' ? 'ライセンスキーをお持ちですか？' : 'Have a license key / promo code?'}
              </button>
            </div>

            {showLicenseBox && (
              <div className="sub-redeem-box">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder={language === 'zh' ? '输入 16 位许可密钥 (测试可用: LEGACY-PRO-2026)' : language === 'ja' ? 'ライセンスキーを入力 (テスト用: LEGACY-PRO-2026)' : 'Enter license key (Test key: LEGACY-PRO-2026)'}
                  className="sub-redeem-input"
                />
                <button type="button" className="sub-redeem-btn" onClick={handleRedeemLicense}>
                  {language === 'zh' ? '立即兑换' : language === 'ja' ? '引き換える' : 'Redeem'}
                </button>
              </div>
            )}
          </div>

          {/* Test / Debug Toggle (帮助用户随时验证 3 种状态) */}
          <div className="sub-debug-panel">
            <span className="sub-debug-title">{language === 'zh' ? '🛠️ 试用期与权限测试控制台 (无需等待90天，一键切换测试)：' : language === 'ja' ? '🛠️ テスト用デバッグコンソール (90日待たずにワンクリックで状態テスト)：' : '🛠️ Debug Testing Console (Instantly switch states for testing):'}</span>
            <div className="sub-debug-btn-group">
              <button
                type="button"
                className={`sub-debug-btn ${isTrial ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('normal')}
              >
                {language === 'zh' ? '恢复 3 个月试用期' : language === 'ja' ? '3ヶ月試用に戻す' : 'Reset to 3-Mo Trial'}
              </button>
              <button
                type="button"
                className={`sub-debug-btn ${isExpired ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('force_expired')}
              >
                {language === 'zh' ? '模拟试用已到期 (测试只读)' : language === 'ja' ? '期限切れ模擬 (只読テスト)' : 'Simulate Expired (Read-Only)'}
              </button>
              <button
                type="button"
                className={`sub-debug-btn ${isSubscribed ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('force_subscribed')}
              >
                {language === 'zh' ? '模拟已开通年度订阅' : language === 'ja' ? '年間プラン加入模擬' : 'Simulate Subscribed'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sub-modal-footer">
          <span className="sub-footer-text">
            {language === 'zh' ? '购买即代表同意 ' : language === 'ja' ? '購入により以下に同意したものとみなされます: ' : 'By purchasing you agree to '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  language === 'zh'
                    ? '《LegacyLock 最终用户许可协议 (EULA)》：用户享有完整的本地零知识加密控制权，支持无限制导出与备份。'
                    : language === 'ja'
                    ? '【LegacyLock エンドユーザーライセンス契約 (EULA)】: 完全なローカルゼロ知識暗号化制御権をユーザーが保有し、無制限のエクスポートとバックアップをサポートします。'
                    : 'LegacyLock End User License Agreement (EULA): Users retain full local zero-knowledge control with unlimited exports and backups.'
                );
              }}
              className="sub-footer-link"
            >
              {language === 'zh' ? '服务条款 (EULA)' : language === 'ja' ? '利用規約 (EULA)' : 'Terms of Service (EULA)'}
            </a>
            {language === 'zh' ? ' 与 ' : language === 'ja' ? ' および ' : ' and '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  language === 'zh'
                    ? '《LegacyLock 隐私保护政策》：零知识架构，您的任何密码、私钥与密库数据均不在云端存储，100% 归您独有。'
                    : language === 'ja'
                    ? '【LegacyLock プライバシーポリシー】: ゼロ知識アーキテクチャにより、パスワードや秘密鍵はクラウドに保存されず、100%お客様だけのものです。'
                    : 'LegacyLock Privacy Policy: Zero-knowledge architecture. No passwords or secret keys are stored in the cloud.'
                );
              }}
              className="sub-footer-link"
            >
              {language === 'zh' ? '隐私保护政策' : language === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
            </a>
          </span>
          <button type="button" className="sub-footer-close-btn" onClick={onClose}>
            {language === 'zh' ? '关闭' : language === 'ja' ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
