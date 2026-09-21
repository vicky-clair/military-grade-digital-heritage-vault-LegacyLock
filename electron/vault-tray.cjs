"use strict";
// Inject native adapters so lifecycle tests never create icons on the user's desktop.
class VaultTray {
  constructor({ Tray, Menu, icon, window, lock, quit, text }) {
    Object.assign(this, { Tray, Menu, icon, window, lock, quit, text });
  }
  restore() {
    const win = this.window();
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
  ensure() {
    if (this.tray && !this.tray.isDestroyed()) return true;
    try {
      this.tray = new this.Tray(this.icon);
      this.tray.setToolTip("LegacyLock");
      this.tray.on("double-click", () => this.restore());
      this.refresh();
      return true;
    } catch {
      this.destroy();
      return false;
    }
  }
  refresh() {
    if (!this.tray || this.tray.isDestroyed()) return;
    this.tray.setContextMenu(
      this.Menu.buildFromTemplate([
        { label: this.text("打开 LegacyLock"), click: () => this.restore() },
        { label: this.text("立即锁定"), click: () => this.lock() },
        { type: "separator" },
        { label: this.text("退出应用"), click: () => this.quit() },
      ]),
    );
  }
  hide() {
    if (!this.ensure()) return false;
    this.lock(); // Hiding must never leave plaintext accessible in a live session.
    this.window().hide();
    return true;
  }
  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}
module.exports = { VaultTray };
