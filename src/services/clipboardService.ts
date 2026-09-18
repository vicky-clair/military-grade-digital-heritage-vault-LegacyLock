/**
 * 军规级剪贴板防嗅探安全管理服务
 * 在用户复制敏感凭据后，根据安全策略在 30 秒内覆写清空剪贴板
 */

let activeClearTimer: any = null;

export interface CopyOptions {
  autoClearSeconds?: number;
  isSensitive?: boolean;
  onCleared?: () => void;
}

export async function copyToClipboard(
  text: string,
  options: CopyOptions = {}
): Promise<boolean> {
  const { autoClearSeconds = 30, isSensitive = true, onCleared } = options;

  try {
    await navigator.clipboard.writeText(text);

    // 检查用户是否在设置中心启用了自动清空剪贴板
    const isAutoClearEnabled =
      localStorage.getItem('legacylock_clear_clipboard') !== 'false';

    if (isSensitive && isAutoClearEnabled && autoClearSeconds > 0) {
      if (activeClearTimer) {
        clearTimeout(activeClearTimer);
        activeClearTimer = null;
      }

      activeClearTimer = setTimeout(async () => {
        try {
          // 仅在当前剪贴板内容仍为刚刚复制的口令（或直接擦除）时执行清空
          await navigator.clipboard.writeText('');
          if (onCleared) {
            onCleared();
          }
        } catch (_) {
          // 剪贴板可能失去焦点或被系统限制
        } finally {
          activeClearTimer = null;
        }
      }, autoClearSeconds * 1000);
    }

    return true;
  } catch (err) {
    console.error('[ClipboardService] Failed to copy to clipboard', err);
    return false;
  }
}

export function cancelClipboardAutoClear(): void {
  if (activeClearTimer) {
    clearTimeout(activeClearTimer);
    activeClearTimer = null;
  }
}
