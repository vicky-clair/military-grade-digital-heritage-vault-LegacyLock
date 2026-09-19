/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 订阅与试用权限服务层 (Subscription & Licensing)
 * ============================================================================
 * 
 * 商业模式与权限规则：
 * 1. 纯订阅制：提供月度服务 (1个月)、季度服务 (3个月)、年度服务 (12个月)，不提供终身买断；
 * 2. 首次启动提供 3 个月 (90天) 全功能免费试用；
 * 3. 3个月试用到期后进入「只读保护模式 (Read-Only Mode)」：
 *    - 用户已录入的所有资产、凭据、私密备注和附件永久安全保留，支持随时解密查看、复制明文和备份导出；
 *    - 严格禁止新增资产、修改已有项目或删除操作；
 *    - 只有用户激活或续订有效订阅服务后，方可恢复写入与修改权限。
 */

export type SubscriptionTier = 'monthly' | 'quarterly' | 'yearly';

export interface SubscriptionState {
  /** 首次启动时间戳 (毫秒) */
  firstLaunchTime: number;
  /** 免费试用期总天数 (固定 90 天，约合 3 个月) */
  trialDurationDays: number;
  /** 当前是否处于有效订阅状态 */
  isSubscribed: boolean;
  /** 当前订阅类型 (月/季/年) */
  tier?: SubscriptionTier;
  /** 订阅生效起始时间戳 */
  subscriptionStartTime?: number;
  /** 订阅到期时间戳 */
  subscriptionExpiresAt?: number;
  /** 关联的授权许可码或商店凭据 ID */
  licenseKey?: string;
  /** 是否处于调试模拟模式 (便于本地测试不同周期) */
  debugMode?: 'normal' | 'force_expired' | 'force_subscribed';
}

const STORAGE_KEY = 'legacylock_subscription_state';
const DEFAULT_TRIAL_DAYS = 90; // 3个月试用期

/**
 * 获取本地持久化的订阅与试用状态
 */
export function getSubscriptionState(): SubscriptionState {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SubscriptionState = JSON.parse(saved);
        // 自动校验订阅是否已自然过期
        if (parsed.isSubscribed && parsed.subscriptionExpiresAt) {
          if (Date.now() > parsed.subscriptionExpiresAt) {
            parsed.isSubscribed = false;
            saveSubscriptionState(parsed);
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[SubscriptionService] Failed to read subscription state', err);
  }

  // 首次运行：初始化 90 天全功能试用期
  const now = Date.now();
  const initialState: SubscriptionState = {
    firstLaunchTime: now,
    trialDurationDays: DEFAULT_TRIAL_DAYS,
    isSubscribed: false,
    debugMode: 'normal',
  };

  saveSubscriptionState(initialState);
  return initialState;
}

/**
 * 保存订阅与试用状态到本地
 */
export function saveSubscriptionState(state: SubscriptionState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      // 触发全局事件通知各组件实时响应
      window.dispatchEvent(new CustomEvent('legacylock:subscription-changed', { detail: state }));
    }
  } catch (err) {
    console.error('[SubscriptionService] Failed to save subscription state', err);
  }
}

/**
 * 计算试用期截止时间戳 (毫秒)
 */
export function getTrialExpiryTimestamp(state: SubscriptionState = getSubscriptionState()): number {
  return state.firstLaunchTime + state.trialDurationDays * 24 * 60 * 60 * 1000;
}

/**
 * 计算试用期剩余天数
 */
export function getTrialDaysRemaining(state: SubscriptionState = getSubscriptionState()): number {
  if (state.debugMode === 'force_expired') return 0;
  if (state.debugMode === 'force_subscribed') return 0;

  const expiry = getTrialExpiryTimestamp(state);
  const diffMs = expiry - Date.now();
  if (diffMs <= 0) return 0;
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * 判断当前是否处于 3 个月免费试用期内
 */
export function isTrialActive(state: SubscriptionState = getSubscriptionState()): boolean {
  if (state.debugMode === 'force_expired') return false;
  if (state.debugMode === 'force_subscribed') return false;

  const expiry = getTrialExpiryTimestamp(state);
  return Date.now() < expiry;
}

/**
 * 判断当前用户是否拥有写入/修改/新增资产权限
 * 核心规则：只有【有效订阅中】或【3个月试用期内】才具备写入权限；试用到期后变为只读！
 */
export function canModifyVault(state: SubscriptionState = getSubscriptionState()): boolean {
  if (state.debugMode === 'force_expired') return false;
  if (state.debugMode === 'force_subscribed') return true;

  if (state.isSubscribed) {
    // 检查订阅是否在有效期内
    if (!state.subscriptionExpiresAt || Date.now() < state.subscriptionExpiresAt) {
      return true;
    }
  }

  // 否则检查 3 个月试用期
  return isTrialActive(state);
}

/**
 * 激活或续订会员服务
 */
export function activateSubscription(
  tier: SubscriptionTier,
  licenseKey?: string
): SubscriptionState {
  const current = getSubscriptionState();
  const now = Date.now();

  let days = 30; // 默认月度
  if (tier === 'quarterly') days = 90; // 季度
  if (tier === 'yearly') days = 365; // 年度

  // 若当前已在订阅期内，则在原有到期时间上累加天数
  let baseTime = now;
  if (current.isSubscribed && current.subscriptionExpiresAt && current.subscriptionExpiresAt > now) {
    baseTime = current.subscriptionExpiresAt;
  }

  const newExpiresAt = baseTime + days * 24 * 60 * 60 * 1000;

  const updatedState: SubscriptionState = {
    ...current,
    isSubscribed: true,
    tier,
    subscriptionStartTime: current.subscriptionStartTime || now,
    subscriptionExpiresAt: newExpiresAt,
    licenseKey: licenseKey || `LIC-${tier.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    debugMode: 'normal',
  };

  saveSubscriptionState(updatedState);
  return updatedState;
}

/**
 * 调试专用：快速切换试用/到期/订阅状态 (方便用户和测试者现场体验各种状态)
 */
export function setDebugSubscriptionMode(
  mode: 'normal' | 'force_expired' | 'force_subscribed'
): SubscriptionState {
  const current = getSubscriptionState();
  const now = Date.now();

  let updated: SubscriptionState = {
    ...current,
    debugMode: mode,
  };

  if (mode === 'force_expired') {
    // 模拟已经过去了 91 天 (试用到期)
    updated.firstLaunchTime = now - 91 * 24 * 60 * 60 * 1000;
    updated.isSubscribed = false;
  } else if (mode === 'force_subscribed') {
    updated.isSubscribed = true;
    updated.tier = 'yearly';
    updated.subscriptionStartTime = now;
    updated.subscriptionExpiresAt = now + 365 * 24 * 60 * 60 * 1000;
  } else {
    // 恢复正常试用期第 1 天
    updated.firstLaunchTime = now;
    updated.isSubscribed = false;
  }

  saveSubscriptionState(updated);
  return updated;
}
