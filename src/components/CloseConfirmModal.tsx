/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 关闭应用拦截与系统托盘选择弹窗 (CloseConfirmModal)
 * ============================================================================
 * 
 * 交互职责：
 * 1. 当用户点击窗口关闭按钮 (X) 时弹出确认窗口；
 * 2. 提供两项选择：
 *    - 最小化到系统托盘 (在后台状态栏继续守护与运行)
 *    - 彻底退出应用 (结束进程)
 * 3. 附带「不再提示，记住我的选择」复选框，选中后跨重启保存，并可在系统设置中随时修改；
 * 4. 界面对齐整体军规深色毛玻璃与渐变设计规范。
 */

import React, { useState } from 'react';
import { X, ShieldCheck, Power, MinusSquare, Check } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface CloseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'minimize_to_tray' | 'quit', remember: boolean) => void;
}

export const CloseConfirmModal: React.FC<CloseConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { language } = useI18n();
  const [selectedAction, setSelectedAction] = useState<'minimize_to_tray' | 'quit'>('minimize_to_tray');
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedAction, rememberChoice);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-window-dialog"
        style={{ width: 490, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="modal-window-header">
          <div className="modal-window-title">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284C7 0%, #00D4FF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
                flexShrink: 0,
              }}
            >
              <MinusSquare style={{ width: 18, height: 18, color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                {language === 'zh' ? '关闭应用确认' : language === 'ja' ? '終了の確認' : 'Close Application Confirmation'}
              </div>
              <p style={{ fontSize: 11.5, color: '#8EA4D4', marginTop: 2 }}>
                {language === 'zh' ? '请选择关闭主窗口时的操作行为' : language === 'ja' ? 'メインウィンドウを閉じる際の動作を選択してください' : 'Choose action when closing main window'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-window-close" title={language === 'zh' ? '取消并返回' : language === 'ja' ? 'キャンセルして戻る' : 'Cancel and return'}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="modal-window-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 选项 1: 最小化到系统托盘 */}
            <div
              onClick={() => setSelectedAction('minimize_to_tray')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                background:
                  selectedAction === 'minimize_to_tray'
                    ? 'rgba(0, 212, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${
                  selectedAction === 'minimize_to_tray'
                    ? '#00D4FF'
                    : 'rgba(255, 255, 255, 0.08)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${
                    selectedAction === 'minimize_to_tray' ? '#00D4FF' : '#7E92C4'
                  }`,
                  background:
                    selectedAction === 'minimize_to_tray' ? '#00D4FF' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                {selectedAction === 'minimize_to_tray' && (
                  <Check style={{ width: 12, height: 12, color: '#0E1525', strokeWidth: 3 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: selectedAction === 'minimize_to_tray' ? '#00D4FF' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{language === 'zh' ? '最小化到系统托盘 (推荐)' : language === 'ja' ? 'システムトレイに最小化 (推奨)' : 'Minimize to System Tray (Recommended)'}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: '1px 6px',
                      borderRadius: 9999,
                      background: 'rgba(52, 211, 153, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                    }}
                  >
                    {language === 'zh' ? '后台守护' : language === 'ja' ? 'バックグラウンド' : 'Background Guard'}
                  </span>
                  {typeof window !== 'undefined' && localStorage.getItem('legacylock_lock_on_tray') !== 'false' && (
                    <span
                      style={{
                        fontSize: 10.5,
                        padding: '1px 6px',
                        borderRadius: 9999,
                        background: 'rgba(0, 212, 255, 0.15)',
                        color: '#00D4FF',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                      }}
                    >
                      {language === 'zh' ? '自动锁定已启用' : language === 'ja' ? '自動ロック有効' : 'Auto-Lock Enabled'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: '#8EA4D4', marginTop: 4, lineHeight: 1.5 }}>
                  {typeof window !== 'undefined' && localStorage.getItem('legacylock_lock_on_tray') === 'false'
                    ? (language === 'zh'
                        ? '应用隐藏至系统托盘保持后台静默守护，当前已在设置中关闭自动锁定。双击托盘图标可瞬间呼出主界面。'
                        : language === 'ja'
                        ? 'アプリはシステムトレイで待機し、自動ロックは無効です。ダブルクリックですぐに開きます。'
                        : 'Application runs silently in the system tray with auto-lock disabled. Double-click tray icon to open.')
                    : (language === 'zh'
                        ? '应用隐藏至系统托盘并自动锁定密库（可在设置中修改为不自动锁定）。双击托盘图标验证密码后方可恢复访问。'
                        : language === 'ja'
                        ? 'アプリはトレイに最小化され自動ロックされます。トレイアイコンをダブルクリックして認証後に復帰します。'
                        : 'Application minimizes to system tray and auto-locks. Double-click tray icon to unlock and resume.')}
                </p>
              </div>
            </div>

            {/* 选项 2: 彻底退出应用 */}
            <div
              onClick={() => setSelectedAction('quit')}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 12,
                background:
                  selectedAction === 'quit'
                    ? 'rgba(244, 63, 94, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                border: `1.5px solid ${
                  selectedAction === 'quit'
                    ? '#F43F5E'
                    : 'rgba(255, 255, 255, 0.08)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${
                    selectedAction === 'quit' ? '#F43F5E' : '#7E92C4'
                  }`,
                  background:
                    selectedAction === 'quit' ? '#F43F5E' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2,
                  flexShrink: 0,
                }}
              >
                {selectedAction === 'quit' && (
                  <Check style={{ width: 12, height: 12, color: '#FFFFFF', strokeWidth: 3 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: selectedAction === 'quit' ? '#F43F5E' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>{language === 'zh' ? '彻底退出 LegacyLock' : language === 'ja' ? 'LegacyLock を完全に終了' : 'Quit LegacyLock Completely'}</span>
                  <Power style={{ width: 13, height: 13, color: '#F43F5E' }} />
                </div>
                <p style={{ fontSize: 11.5, color: '#8EA4D4', marginTop: 4, lineHeight: 1.5 }}>
                  {language === 'zh'
                    ? '安全退出全部进程并释放内存，终止防暂离与外接介质热插拔监控。下次需从开始菜单或快捷方式重新启动。'
                    : language === 'ja'
                    ? 'すべてのプロセスを安全に終了し、メモリを解放します。次回はショートカット等から起動してください。'
                    : 'Safely terminates all processes, frees memory, and stops hardware monitoring. Restart anytime from shortcut.'}
                </p>
              </div>
            </div>
          </div>

          {/* 不再提示勾选框 */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => setRememberChoice(!rememberChoice)}
          >
            <input
              type="checkbox"
              id="rememberCloseChoice"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#00D4FF', width: 15, height: 15 }}
            />
            <label
              htmlFor="rememberCloseChoice"
              style={{ fontSize: 12, color: '#CBD5E1', cursor: 'pointer' }}
            >
              {language === 'zh'
                ? '不再提示，记住我的选择 (后续可随时在「系统设置」中修改)'
                : language === 'ja'
                ? '次回から表示しない (後から「設定」画面でいつでも変更可能)'
                : 'Do not ask again, remember my choice (Can be changed in Settings)'}
            </label>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="modal-window-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#8EA4D4' }}>
            <ShieldCheck style={{ width: 15, height: 15, color: '#00D4FF' }} />
            <span>{language === 'zh' ? '军规安全守护就绪' : language === 'ja' ? '軍用規格セキュリティ待機中' : 'Military Security Guard Ready'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-action-cancel"
            >
              {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-action-submit"
              style={{
                background:
                  selectedAction === 'quit'
                    ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                    : 'linear-gradient(135deg, #0284C7 0%, #00D4FF 100%)',
              }}
            >
              {language === 'zh' ? '确定执行' : language === 'ja' ? '実行する' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
