/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 剪贴板防嗅探安全管理服务 (Clipboard Security Service)
 * ============================================================================
 * 
 * 安全威胁模型防御：
 * 用户在复制私钥、助记词或高强度密码后，系统剪贴板往往长期滞留敏感明文。
 * 恶意后台木马、流氓软件或同机其他进程极易通过监听或轮询剪贴板盗取核心资产。
 * 
 * 防御方案：
 * 1. 复制操作自动挂载高精度销毁定时器 (默认 30 秒倒计时)；
 * 2. 定时器触发后主动调用底层 API 将剪贴板内容擦除置空 ('')；
 * 3. 支持跨操作重置计时器，防范并发复制覆盖导致定时泄漏。
 */

// 活跃的剪贴板自动擦除计时器句柄
let activeClearTimer: any = null;

/**
 * 剪贴板复制选项参数
 */
export interface CopyOptions {
  /** 自动擦除清空延迟秒数 (默认 30 秒，传 0 则不自动清空) */
  autoClearSeconds?: number;
  /** 是否标记为绝密敏感数据 (为 true 时自动激活清空倒计时) */
  isSensitive?: boolean;
  /** 剪贴板成功清空后的回调通知函数 */
  onCleared?: () => void;
}

/**
 * 安全复制文本至系统剪贴板，并根据策略在 30 秒后自动清空
 * 
 * @param text 待写入剪贴板的明文内容 (密码、助记词、私钥等)
 * @param options 控制参数选项
 * @returns {Promise<boolean>} 是否成功写入剪贴板
 */
export async function copyToClipboard(
  text: string,
  options: CopyOptions = {}
): Promise<boolean> {
  const { autoClearSeconds = 30, isSensitive = true, onCleared } = options;

  try {
    // 调用现代浏览器安全异步剪贴板 API
    await navigator.clipboard.writeText(text);

    // 检查用户是否在设置中心启用了自动清空剪贴板功能
    const isAutoClearEnabled =
      localStorage.getItem('legacylock_clear_clipboard') !== 'false';

    // 仅在数据标记为敏感且功能开启时挂载自毁定时器
    if (isSensitive && isAutoClearEnabled && autoClearSeconds > 0) {
      if (activeClearTimer) {
        clearTimeout(activeClearTimer);
        activeClearTimer = null;
      }

      activeClearTimer = setTimeout(async () => {
        try {
          // 主动擦除剪贴板内容为空字符串，防范其他进程嗅探
          await navigator.clipboard.writeText('');
          if (onCleared) {
            onCleared();
          }
        } catch (_) {
          // 剪贴板可能因窗口失去系统焦点被系统安全权限拦截，静默失败
        } finally {
          activeClearTimer = null;
        }
      }, autoClearSeconds * 1000);
    }

    return true;
  } catch (err) {
    console.error('[ClipboardService] 写入系统剪贴板失败:', err);
    return false;
  }
}

/**
 * 取消当前挂起的剪贴板自动擦除倒计时
 */
export function cancelClipboardAutoClear(): void {
  if (activeClearTimer) {
    clearTimeout(activeClearTimer);
    activeClearTimer = null;
  }
}
