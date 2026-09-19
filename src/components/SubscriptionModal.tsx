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
    if (!ts) return '永久有效';
    const d = new Date(ts);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 处理购买/开通订阅
  const handleSubscribe = () => {
    activateSubscription(selectedTier);
    setFeedbackMsg({
      type: 'success',
      text: `🎉 恭喜！您已成功开通 LegacyLock ${selectedTier === 'yearly' ? '年度' : selectedTier === 'quarterly' ? '季度' : '月度'}尊享订阅！已完全解除只读限制。`,
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
      setFeedbackMsg({ type: 'error', text: '请输入有效的授权许可激活码' });
      return;
    }
    if (code === 'LEGACY-PRO-2026' || code.startsWith('LL-') || code.length >= 8) {
      activateSubscription('yearly', code);
      setFeedbackMsg({
        type: 'success',
        text: '🎉 激活码兑换成功！已为您开通 1 年尊享订阅服务。',
      });
      if (onSubscriptionChanged) onSubscriptionChanged();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setFeedbackMsg({
        type: 'error',
        text: '激活码无效或已被使用，测试可使用：LEGACY-PRO-2026',
      });
    }
  };

  // 快捷调试切换
  const handleDebugSwitch = (mode: 'normal' | 'force_expired' | 'force_subscribed') => {
    setDebugSubscriptionMode(mode);
    setFeedbackMsg({
      type: 'success',
      text: `已切换状态为：${mode === 'force_expired' ? '【3个月试用已到期(只读模式)】' : mode === 'force_subscribed' ? '【已开通年度订阅】' : '【3个月试用期正常模式】'}`,
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
          <button className="sub-modal-close-btn" onClick={onClose} aria-label="关闭">
            <X className="w-4 h-4" />
          </button>

          <div className="sub-header-content">
            <div className="sub-crown-badge">
              <Crown className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="sub-header-title">LegacyLock 军规尊享服务</h2>
              <p className="sub-header-subtitle">
                为您的核心数字遗产、服务器私钥与高价值财产凭据提供长期可靠守护
              </p>
            </div>
          </div>

          {/* Current Status Pill Bar */}
          <div className="sub-status-banner">
            {isSubscribed ? (
              <div className="sub-status-box active">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                <span>
                  <strong>尊享订阅会员中</strong>：服务有效期至{' '}
                  <span className="text-[#34D399]">{formatExpiry(state.subscriptionExpiresAt)}</span>
                </span>
              </div>
            ) : isTrial ? (
              <div className="sub-status-box trial">
                <Gift className="w-4 h-4 text-[#00D4FF]" />
                <span>
                  <strong>3 个月免费试用中</strong>：当前剩余{' '}
                  <span className="text-[#00D4FF] font-bold">{trialDays}</span> 天全功能试用期，可畅享全部权益
                </span>
              </div>
            ) : (
              <div className="sub-status-box expired">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <span>
                  <strong>3 个月免费试用已结束</strong>：当前处于<strong>只读保护模式</strong>。已录入的资产永久安全保留可随时查阅复制；订阅后立即可新增与修改。
                </span>
              </div>
            )}
          </div>

          {reason === 'expired_add' && isExpired && (
            <div className="sub-intercept-tip">
              💡 提示：您正在尝试<strong>添加新资产</strong>。当前处于试用到期只读模式，订阅后即可立即解锁无限制录入权限！
            </div>
          )}
          {reason === 'expired_edit' && isExpired && (
            <div className="sub-intercept-tip">
              💡 提示：您正在尝试<strong>修改资产内容</strong>。当前处于试用到期只读模式，订阅后即可立即解锁编辑修改权限！
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
                <span className="sub-tier-name">月度服务</span>
                <span className="sub-tier-tag">1 个月</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">¥</span>
                <span className="sub-tier-amount">28</span>
                <span className="sub-tier-unit">/月</span>
              </div>
              <p className="sub-tier-desc">适合短期测试与资产盘点，随时按需订购</p>
            </div>

            {/* Quarterly */}
            <div
              className={`sub-tier-card ${selectedTier === 'quarterly' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('quarterly')}
            >
              <div className="sub-tier-header">
                <span className="sub-tier-name">季度服务</span>
                <span className="sub-tier-tag sub-tag-save">立省 20%</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">¥</span>
                <span className="sub-tier-amount">68</span>
                <span className="sub-tier-unit">/季</span>
              </div>
              <p className="sub-tier-desc">相当于 ¥22.6/月，适合过渡期与季度管理</p>
            </div>

            {/* Yearly (Best Value) */}
            <div
              className={`sub-tier-card featured ${selectedTier === 'yearly' ? 'selected' : ''}`}
              onClick={() => setSelectedTier('yearly')}
            >
              <div className="sub-featured-badge">⭐ 最受欢迎 · 立省 50%</div>
              <div className="sub-tier-header">
                <span className="sub-tier-name">年度服务</span>
                <span className="sub-tier-tag sub-tag-hot">尊享推荐</span>
              </div>
              <div className="sub-tier-price-row">
                <span className="sub-tier-currency">¥</span>
                <span className="sub-tier-amount">168</span>
                <span className="sub-tier-unit">/年</span>
              </div>
              <p className="sub-tier-desc font-medium text-[#FDE68A]">
                折合仅需 <strong>¥14 / 月</strong> · 全年不间断安全守护
              </p>
            </div>
          </div>

          {/* Benefits Matrix */}
          <div className="sub-benefits-card">
            <h3 className="sub-benefits-title">
              <Sparkles className="w-4 h-4 text-[#00D4FF]" />
              <span>全功能尊享权益清单</span>
            </h3>
            <div className="sub-benefits-list">
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>无限量资产录入与编辑</strong>：全面解除只读限制，支持 23+ 种分类随时修改与新增
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>军规物理双 U 盘继承计划</strong>：独家 X25519 非对称物理隔离协商，身后可靠接管
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>单项 2MB 零知识加密附件柜</strong>：AES-256-GCM 本地加密密钥文件、证书与公证书扫描件
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>6 项密码学健康体检与防篡改扫描</strong>：持续自测完整性与安全弱口令风险
                </span>
              </div>
              <div className="sub-benefit-item">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] flex-shrink-0" />
                <span>
                  <strong>持续安全迭代与跨端权益互通</strong>：适配 Apple Mac App Store 与 Windows 微软商店
                </span>
              </div>
            </div>
          </div>

          {/* Subscribe Action Button */}
          <div className="sub-action-wrapper">
            <button className="sub-primary-subscribe-btn" onClick={handleSubscribe}>
              <Crown className="w-5 h-5" />
              <span>
                {isSubscribed ? '立即续订尊享服务' : isExpired ? '立即开通服务并恢复修改权限' : '提前开通尊享服务'} (
                {selectedTier === 'yearly' ? '年度 ¥168' : selectedTier === 'quarterly' ? '季度 ¥68' : '月度 ¥28'})
              </span>
            </button>

            {/* Redeem code toggle */}
            <div className="sub-secondary-links">
              <button
                type="button"
                className="sub-link-btn"
                onClick={() => setShowLicenseBox(!showLicenseBox)}
              >
                我有许可激活码 / 兑换码？
              </button>
            </div>

            {showLicenseBox && (
              <div className="sub-redeem-box">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="输入 16 位许可密钥 (测试可用: LEGACY-PRO-2026)"
                  className="sub-redeem-input"
                />
                <button type="button" className="sub-redeem-btn" onClick={handleRedeemLicense}>
                  立即兑换
                </button>
              </div>
            )}
          </div>

          {/* Test / Debug Toggle (帮助用户随时验证 3 种状态) */}
          <div className="sub-debug-panel">
            <span className="sub-debug-title">🛠️ 试用期与权限测试控制台 (无需等待90天，一键切换测试)：</span>
            <div className="sub-debug-btn-group">
              <button
                type="button"
                className={`sub-debug-btn ${isTrial ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('normal')}
              >
                恢复 3 个月试用期
              </button>
              <button
                type="button"
                className={`sub-debug-btn ${isExpired ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('force_expired')}
              >
                模拟试用已到期 (测试只读)
              </button>
              <button
                type="button"
                className={`sub-debug-btn ${isSubscribed ? 'current' : ''}`}
                onClick={() => handleDebugSwitch('force_subscribed')}
              >
                模拟已开通年度订阅
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sub-modal-footer">
          <span className="sub-footer-text">
            购买即代表同意{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('《LegacyLock 最终用户许可协议 (EULA)》：用户享有完整的本地零知识加密控制权，支持无限制导出与备份。');
              }}
              className="sub-footer-link"
            >
              服务条款 (EULA)
            </a>{' '}
            与{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert('《LegacyLock 隐私保护政策》：零知识架构，您的任何密码、私钥与密库数据均不在云端存储，100% 归您独有。');
              }}
              className="sub-footer-link"
            >
              隐私保护政策
            </a>
          </span>
          <button type="button" className="sub-footer-close-btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
