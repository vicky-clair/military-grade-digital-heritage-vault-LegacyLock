const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('legacyLockAPI', {
  // 平台与版本信息
  isElectron: true,
  platform: process.platform,

  // 扫描系统可移动驱动器 (U盘)
  scanUsbDrives: () => ipcRenderer.invoke('vault:scan-usb-drives'),

  // 文件选择与保存对话框
  selectKeyFile: (type) => ipcRenderer.invoke('vault:select-key-file', type),
  selectOutputDirectory: () => ipcRenderer.invoke('vault:select-output-directory'),
  saveBinaryFile: (defaultName, dataBase64) => ipcRenderer.invoke('vault:save-binary-file', defaultName, dataBase64),

  // 调用 Rust 核心执行命令
  generateKeys: (options) => ipcRenderer.invoke('vault:generate-keys', options),
  encryptVault: (options) => ipcRenderer.invoke('vault:encrypt', options),
  unlockVault: (options) => ipcRenderer.invoke('vault:unlock', options),
  verifyKeys: (options) => ipcRenderer.invoke('vault:verify', options),

  // 本地存储管理
  readVaultContainer: () => ipcRenderer.invoke('vault:read-container'),
  saveVaultContainer: (data) => ipcRenderer.invoke('vault:save-container', data),
});
