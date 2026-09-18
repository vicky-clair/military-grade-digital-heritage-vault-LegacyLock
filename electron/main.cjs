const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;

function getVaultCliPath() {
  const releasePath = path.join(__dirname, '..', 'crypt', 'target', 'release', 'vault-cli.exe');
  const debugPath = path.join(__dirname, '..', 'crypt', 'target', 'debug', 'vault-cli.exe');
  if (fs.existsSync(releasePath)) return releasePath;
  if (fs.existsSync(debugPath)) return debugPath;
  return 'vault-cli';
}

function runVaultCli(args) {
  return new Promise((resolve, reject) => {
    const cliPath = getVaultCliPath();
    const proc = spawn(cliPath, args, { cwd: path.join(__dirname, '..') });
    
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      if (code === 0) {
        try {
          // 尝试解析为 JSON
          resolve(JSON.parse(stdout));
        } catch (_) {
          resolve(stdout.trim());
        }
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `vault-cli exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function createWindow() {
  console.log('[Electron Main] Creating main browser window...');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'LegacyLock 遗产保险锁 (军规级数字遗产双保险箱)',
    backgroundColor: '#061524',
    show: false, // 先隐藏，等 ready-to-show 再显示
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[Electron Main] Window ready-to-show event fired! Showing and focusing window.');
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron Main] Failed to load URL:', validatedURL, 'Error:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron Main] WebContents did-finish-load successfully!');
  });

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  console.log('[Electron Main] Loading file from:', distPath);
  mainWindow.loadFile(distPath);
}

// 注册 IPC 通信
function registerIpcHandlers() {
  // 1. 扫描可移动驱动器 (U盘)
  ipcMain.handle('vault:scan-usb-drives', async () => {
    try {
      const drives = [];
      // 在 Windows 下检查常见盘符
      const letters = 'EFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of letters) {
        const root = `${letter}:\\`;
        if (fs.existsSync(root)) {
          try {
            const hasUserKey = fs.existsSync(path.join(root, 'user-key.bin'));
            const hasHeirKey = fs.existsSync(path.join(root, 'heir-key.bin'));
            const hasConfig = fs.existsSync(path.join(root, 'config.bin'));
            drives.push({
              mountPath: root,
              name: `可移动磁盘 (${letter}:)`,
              hasUserKey,
              hasHeirKey,
              hasConfig,
            });
          } catch (_) {}
        }
      }

      // 添加项目目录下的模拟U盘槽位支持 (用于开发/无物理U盘测试)
      const mockDir = path.join(__dirname, '..', 'mock_usb');
      if (fs.existsSync(mockDir)) {
        const userSlot = path.join(mockDir, 'user_usb');
        const heirSlot = path.join(mockDir, 'heir_usb');
        if (fs.existsSync(userSlot)) {
          drives.push({
            mountPath: userSlot,
            name: '模拟插槽 A: [用户U盘]',
            hasUserKey: fs.existsSync(path.join(userSlot, 'user-key.bin')),
            hasHeirKey: false,
            hasConfig: false,
            isMock: true,
          });
        }
        if (fs.existsSync(heirSlot)) {
          drives.push({
            mountPath: heirSlot,
            name: '模拟插槽 B: [继承人U盘]',
            hasUserKey: false,
            hasHeirKey: fs.existsSync(path.join(heirSlot, 'heir-key.bin')),
            hasConfig: fs.existsSync(path.join(heirSlot, 'config.bin')),
            isMock: true,
          });
        }
      }

      return { success: true, drives };
    } catch (err) {
      return { success: false, error: err.message, drives: [] };
    }
  });

  // 2. 选择密钥文件对话框
  ipcMain.handle('vault:select-key-file', async (_, type) => {
    const filters = [{ name: 'Binary Key Files (*.bin)', extensions: ['bin'] }, { name: 'All Files', extensions: ['*'] }];
    const res = await dialog.showOpenDialog(mainWindow, {
      title: `选择 ${type === 'user' ? '用户U盘密钥 (user-key.bin)' : type === 'heir' ? '继承人U盘密钥 (heir-key.bin)' : '配置文件 (config.bin)'}`,
      properties: ['openFile'],
      filters,
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return { canceled: false, path: res.filePaths[0] };
    }
    return { canceled: true };
  });

  // 3. 选择输出目录
  ipcMain.handle('vault:select-output-directory', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: '选择保存密钥的U盘或目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!res.canceled && res.filePaths.length > 0) {
      return { canceled: false, path: res.filePaths[0] };
    }
    return { canceled: true };
  });

  // 4. 保存二进制文件
  ipcMain.handle('vault:save-binary-file', async (_, defaultName, dataBase64) => {
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'Binary File (*.bin)', extensions: ['bin'] }],
    });
    if (!res.canceled && res.filePath) {
      const buffer = Buffer.from(dataBase64, 'base64');
      fs.writeFileSync(res.filePath, buffer);
      return { success: true, path: res.filePath };
    }
    return { success: false, canceled: true };
  });

  // 5. 生成双U盘密钥
  ipcMain.handle('vault:generate-keys', async (_, options) => {
    try {
      const userOut = options.userOut || path.join(__dirname, '..', 'user-key.bin');
      const heirOut = options.heirOut || path.join(__dirname, '..', 'heir-key.bin');
      const configOut = options.configOut || path.join(__dirname, '..', 'config.bin');
      const expiryDays = options.expiryDays || 365;

      const res = await runVaultCli([
        'generate-keys',
        '--user-out', userOut,
        '--heir-out', heirOut,
        '--config-out', configOut,
        '--expiry-days', expiryDays.toString(),
      ]);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 6. 加密资产库
  ipcMain.handle('vault:encrypt', async (_, options) => {
    try {
      const { userKey, heirKey, config, inputData, outputPath } = options;
      // 临时明文文件
      const tempInput = path.join(app.getPath('temp'), `vault-in-${Date.now()}.json`);
      fs.writeFileSync(tempInput, JSON.stringify(inputData, null, 2), 'utf8');

      const out = outputPath || path.join(__dirname, '..', 'vault.locked');
      const res = await runVaultCli([
        'encrypt',
        '--user-key', userKey,
        '--heir-key', heirKey,
        '--config', config,
        '--input', tempInput,
        '--output', out,
      ]);

      try { fs.unlinkSync(tempInput); } catch (_) {}
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. 双U盘联合解锁
  ipcMain.handle('vault:unlock', async (_, options) => {
    try {
      const { userKey, heirKey, config, vaultPath } = options;
      const vault = vaultPath || path.join(__dirname, '..', 'vault.locked');
      const res = await runVaultCli([
        'unlock',
        '--user-key', userKey,
        '--heir-key', heirKey,
        '--config', config,
        '--vault', vault,
      ]);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 8. 校验双U盘时效与有效性
  ipcMain.handle('vault:verify', async (_, options) => {
    try {
      const { userKey, heirKey, config } = options;
      const res = await runVaultCli([
        'verify',
        '--user-key', userKey,
        '--heir-key', heirKey,
        '--config', config,
      ]);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 9. 读取本地容器
  ipcMain.handle('vault:read-container', async () => {
    const vaultPath = path.join(__dirname, '..', 'vault.locked');
    if (fs.existsSync(vaultPath)) {
      try {
        const content = fs.readFileSync(vaultPath, 'utf8');
        return { exists: true, container: JSON.parse(content) };
      } catch (e) {
        return { exists: true, error: e.message };
      }
    }
    return { exists: false };
  });

  // 10. 保存容器
  ipcMain.handle('vault:save-container', async (_, data) => {
    const vaultPath = path.join(__dirname, '..', 'vault.locked');
    fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, path: vaultPath };
  });
}

app.whenReady().then(() => {
  console.log('[Electron Main] app.whenReady fired!');
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
