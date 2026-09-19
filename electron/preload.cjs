/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 预加载脚本 (Preload Script / Context Bridge)
 * ============================================================================
 * 
 * 安全设计准则：
 * 1. 严格开启上下文隔离 (contextIsolation: true)，禁止直接在 window 上挂载 Node.js 原始对象。
 * 2. 禁止将 ipcRenderer 实例暴露给渲染进程，仅暴露白名单约束的具体异步调用通道。
 * 3. 防范原型链污染 (Prototype Pollution) 与任意代码注入。
 */

const { contextBridge, ipcRenderer } = require('electron');

// 将受控 API 安全注入到渲染进程的全局上下文 window.legacyLockAPI 中
contextBridge.exposeInMainWorld('legacyLockAPI', {
  /** 标识当前是否运行在原生 Electron 桌面端环境 */
  isElectron: true,

  /** 当前操作系统平台 ('win32' | 'darwin' | 'linux') */
  platform: process.platform,

  /**
   * 扫描系统外部存储介质 (U盘、USB移动硬盘、移动SSD)
   * 支持 Windows、macOS 和 Linux 三大操作系统底层探查
   * @returns {Promise<{success: boolean, drives: Array, error?: string}>}
   */
  scanUsbDrives: () => ipcRenderer.invoke('vault:scan-usb-drives'),

  /**
   * 唤起系统级打开文件对话框，选择密钥文件 (.bin)
   * @param {'user' | 'heir' | 'config'} type 密钥文件类型
   * @returns {Promise<{canceled: boolean, path?: string}>}
   */
  selectKeyFile: (type) => ipcRenderer.invoke('vault:select-key-file', type),

  /**
   * 唤起系统级选择目录对话框，指定密钥导出目标U盘或文件夹
   * @returns {Promise<{canceled: boolean, path?: string}>}
   */
  selectOutputDirectory: () => ipcRenderer.invoke('vault:select-output-directory'),

  /**
   * 唤起系统级保存文件对话框，持久化写入二进制密钥数据包
   * @param {string} defaultName 默认建议保存文件名 (已做 basename 防目录穿越清洗)
   * @param {string} dataBase64 Base64 编码的二进制数据内容
   * @returns {Promise<{success: boolean, path?: string, canceled?: boolean}>}
   */
  saveBinaryFile: (defaultName, dataBase64) => ipcRenderer.invoke('vault:save-binary-file', defaultName, dataBase64),

  /**
   * 调用 Rust 原生密码学核心工具 (vault-cli) 生成双U盘密钥与配置文件
   * @param {{userOut?: string, heirOut?: string, configOut?: string, expiryDays: number}} options
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  generateKeys: (options) => ipcRenderer.invoke('vault:generate-keys', options),

  /**
   * 调用 Rust 原生密码学核心工具执行 AES-256-GCM 认证加密
   * @param {{userKey: string, heirKey: string, config: string, inputData: any, outputPath?: string}} options
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  encryptVault: (options) => ipcRenderer.invoke('vault:encrypt', options),

  /**
   * 调用 Rust 核心执行双U盘联合密码协商解锁并解密
   * @param {{userKey: string, heirKey: string, config: string, vaultPath?: string}} options
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  unlockVault: (options) => ipcRenderer.invoke('vault:unlock', options),

  /**
   * 校验双U盘密钥有效性与继承计划是否超出有效期
   * @param {{userKey: string, heirKey: string, config: string}} options
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  verifyKeys: (options) => ipcRenderer.invoke('vault:verify', options),

  /**
   * 从用户数据目录安全读取本地加密容器 (vault.locked)
   * @returns {Promise<{exists: boolean, container?: any, error?: string}>}
   */
  readVaultContainer: () => ipcRenderer.invoke('vault:read-container'),

  /**
   * 安全保存加密容器至系统用户数据目录 (vault.locked) 或目标 U 盘/文件夹
   * @param {any} data 密文容器数据
   * @returns {Promise<{success: boolean, path?: string}>}
   */
  saveVaultContainer: (data) => ipcRenderer.invoke('vault:save-container', data),

  /**
   * 写入物理介质硬件防克隆绑定凭据
   * @param {{drivePath: string, fingerprint: string, signature?: string}} options
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  writeDriveBinding: (options) => ipcRenderer.invoke('vault:write-drive-binding', options),

  /**
   * 校验物理介质硬件防克隆绑定
   * @param {{drivePath: string, currentFingerprint: string}} options
   * @returns {Promise<{success: boolean, isBound?: boolean, matched?: boolean, error?: string}>}
   */
  verifyDriveBinding: (options) => ipcRenderer.invoke('vault:verify-drive-binding', options),

  /**
   * 获取应用跨重启持久化配置与主题偏好
   * @returns {Promise<{success: boolean, settings: Record<string, any>}>}
   */
  getAppSettings: () => ipcRenderer.invoke('app:get-settings'),

  /**
   * 保存应用跨重启持久化配置与主题偏好
   * @param {Record<string, any>} settings
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  saveAppSettings: (settings) => ipcRenderer.invoke('app:save-settings', settings),

  /**
   * 最小化当前窗口
   */
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),

  /**
   * 最大化 / 还原当前窗口
   */
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),

  /**
   * 获取当前窗口是否处于最大化状态
   */
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  /**
   * 设置应用界面缩放因子 (0.6 ~ 2.0)
   */
  setZoom: (factor) => ipcRenderer.invoke('window:set-zoom', factor),

  /**
   * 获取当前应用界面缩放因子
   */
  getZoom: () => ipcRenderer.invoke('window:get-zoom'),

  /**
   * 监听窗口最大化与还原状态切换
   */
  onMaximizedChange: (callback) => {
    const handler = (_event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },

  /**
   * 请求关闭当前窗口 (触发关闭拦截)
   */
  closeWindow: () => ipcRenderer.invoke('window:close'),

  /**
   * 最小化到系统托盘 (隐藏主窗口并在系统托盘常驻)
   */
  minimizeToTray: () => ipcRenderer.invoke('app:minimize-to-tray'),

  /**
   * 彻底退出应用进程
   */
  quitApp: () => ipcRenderer.invoke('app:quit'),

  /**
   * 监听关闭应用请求事件
   */
  onRequestClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:request-close', handler);
    return () => ipcRenderer.removeListener('app:request-close', handler);
  },

  /**
   * 监听托盘快捷锁屏事件
   */
  onLockVault: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:lock-vault', handler);
    return () => ipcRenderer.removeListener('app:lock-vault', handler);
  },
});
