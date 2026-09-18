const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

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

const http = require('http');

let embeddedServerUrl = 'http://127.0.0.1:5173';

function startEmbeddedServer(port = 5173) {
  return new Promise((resolve) => {
    const distDir = path.join(__dirname, '..', 'dist');
    const mimes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const absDistDir = path.resolve(distDir);

    const server = http.createServer((req, res) => {
      try {
        let rawPath = req.url.split('?')[0];
        let reqPath = decodeURIComponent(rawPath);
        if (reqPath === '/' || !reqPath) reqPath = '/index.html';
        
        // 安全路径规范化，杜绝目录穿越攻击 (Path Traversal Protection)
        const normalizedRel = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.resolve(absDistDir, '.' + normalizedRel);
        
        // 强制校验绝对路径必须处于 distDir 根目录下
        if (!filePath.startsWith(absDistDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('403 Forbidden: Path Traversal Intercepted by LegacyLock Security');
          return;
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(absDistDir, 'index.html');
        }

        const ext = path.extname(filePath);
        const contentType = mimes[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        
        // 限制 CORS 仅允许本机应用环境，防御外部网页跨域探测
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': `http://127.0.0.1:${port}`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        });
        res.end(content);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(e.message);
      }
    });

    server.on('error', () => {
      // 端口已被占用时（例如已运行 vite），直接复用
      resolve(`http://127.0.0.1:${port}`);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`[Local Server] Serving on http://127.0.0.1:${port}`);
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

async function createWindow() {
  console.log('[Electron Main] Creating main browser window...');
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'LegacyLock 遗产保险锁 (军规级数字遗产双保险箱)',
    backgroundColor: '#0E1525',
    show: true, // 确保直接可见
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.show();
  mainWindow.focus();

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron Main] Failed to load URL:', validatedURL, 'Error:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron Main] WebContents did-finish-load successfully!');
  });

  const url = await startEmbeddedServer();
  console.log('[Electron Main] Loading URL:', url);
  mainWindow.loadURL(url);
}

// 注册 IPC 通信
function registerIpcHandlers() {
// ====== 跨平台驱动器识别引擎 (Windows, macOS, Linux) ======
function scanWindowsDrives() {
  const drives = [];
  const systemDrive = (process.env.SystemDrive || 'C:').toUpperCase();
  const seenPaths = new Set();

  try {
    let usbDiskNumbers = new Set();
    try {
      const diskCmd = `Get-Disk | Where-Object { $_.BusType -eq 'USB' } | Select-Object -ExpandProperty Number | ConvertTo-Json`;
      const diskOut = execSync(`powershell -NoProfile -Command "${diskCmd}"`, { encoding: 'utf8', timeout: 3500 });
      const parsedDisks = JSON.parse(diskOut.trim());
      const diskList = Array.isArray(parsedDisks) ? parsedDisks : (parsedDisks !== '' && parsedDisks !== null ? [parsedDisks] : []);
      for (const n of diskList) usbDiskNumbers.add(Number(n));
    } catch (_) {}

    const driveUsbMap = new Map();
    try {
      const partCmd = `Get-Partition | Where-Object DriveLetter | Select-Object DiskNumber, DriveLetter | ConvertTo-Json`;
      const partOut = execSync(`powershell -NoProfile -Command "${partCmd}"`, { encoding: 'utf8', timeout: 3500 });
      const parsedParts = JSON.parse(partOut.trim());
      const partList = Array.isArray(parsedParts) ? parsedParts : [parsedParts];
      for (const p of partList) {
        if (p && p.DriveLetter) {
          const letter = `${p.DriveLetter}:`.toUpperCase();
          if (usbDiskNumbers.has(Number(p.DiskNumber))) {
            driveUsbMap.set(letter, true);
          }
        }
      }
    } catch (_) {}

    const psCmd = `Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, DriveType, Size, FreeSpace, FileSystem | ConvertTo-Json`;
    const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8', timeout: 4000 });
    const parsed = JSON.parse(out.trim());
    const list = Array.isArray(parsed) ? parsed : [parsed];

    for (const d of list) {
      if (!d || !d.DeviceID) continue;
      const letter = d.DeviceID.toUpperCase();
      if (d.DriveType === 5) continue; // 忽略光驱

      const isSystem = letter === systemDrive;
      const root = `${letter}\\`;
      const sizeBytes = Number(d.Size) || 0;
      const freeBytes = Number(d.FreeSpace) || 0;
      const label = d.VolumeName ? d.VolumeName.trim() : '';
      const isUsbBus = driveUsbMap.get(letter) === true;
      const isRemovable = d.DriveType === 2;
      const isExternal = isUsbBus || isRemovable || (!isSystem && d.DriveType === 3);

      let mediaType = 'UsbFlash';
      if (sizeBytes > 256 * 1024 * 1024 * 1024) {
        mediaType = 'UsbHDD';
      } else if (sizeBytes > 64 * 1024 * 1024 * 1024) {
        mediaType = 'UsbSSD';
      }

      let typeTag = 'U盘';
      if (mediaType === 'UsbHDD') typeTag = '移动硬盘';
      else if (mediaType === 'UsbSSD') typeTag = '移动SSD';

      const displayName = label
        ? `${label} (${letter}) - ${typeTag}`
        : `${isSystem ? '本地系统盘' : '外部存储'} (${letter}) - ${typeTag}`;

      let hasUserKey = false;
      let hasHeirKey = false;
      let hasConfig = false;
      try {
        hasUserKey = fs.existsSync(path.join(root, 'user-key.bin'));
        hasHeirKey = fs.existsSync(path.join(root, 'heir-key.bin'));
        hasConfig = fs.existsSync(path.join(root, 'config.bin'));
      } catch (_) {}

      seenPaths.add(letter);
      drives.push({
        mountPath: root,
        name: displayName,
        volumeLabel: label,
        driveLetter: letter,
        size: sizeBytes,
        freeSpace: freeBytes,
        fileSystem: d.FileSystem || 'NTFS',
        isRemovable,
        isExternal,
        isSystem,
        mediaType,
        hasUserKey,
        hasHeirKey,
        hasConfig,
      });
    }
  } catch (err) {
    console.error('[Windows PowerShell Scan Error, using fallback]', err.message);
  }

  // 兜底轮询 A~Z 盘符（跳过系统盘），确保 100% 检测到 D: 及其他所有外接盘符
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letter of allLetters) {
    const devId = `${letter}:`;
    if (seenPaths.has(devId)) continue;
    const root = `${devId}\\`;
    if (fs.existsSync(root)) {
      const isSystem = devId === systemDrive;
      let hasUserKey = false;
      let hasHeirKey = false;
      let hasConfig = false;
      try {
        hasUserKey = fs.existsSync(path.join(root, 'user-key.bin'));
        hasHeirKey = fs.existsSync(path.join(root, 'heir-key.bin'));
        hasConfig = fs.existsSync(path.join(root, 'config.bin'));
      } catch (_) {}

      drives.push({
        mountPath: root,
        name: `${isSystem ? '系统本地磁盘' : '外部存储设备'} (${devId})`,
        volumeLabel: '',
        driveLetter: devId,
        size: 0,
        freeSpace: 0,
        fileSystem: 'NTFS',
        isRemovable: !isSystem,
        isExternal: !isSystem,
        isSystem,
        mediaType: 'UsbHDD',
        hasUserKey,
        hasHeirKey,
        hasConfig,
      });
    }
  }

  return drives;
}

function scanMacDrives() {
  const drives = [];
  try {
    const volumesDir = '/Volumes';
    if (fs.existsSync(volumesDir)) {
      const entries = fs.readdirSync(volumesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const name = entry.name;
        if (name === 'Macintosh HD' || name === 'Macintosh HD - Data' || name === 'Recovery' || name === 'Preboot') continue;
        const mountPath = path.join(volumesDir, name);
        
        let hasUserKey = false;
        let hasHeirKey = false;
        let hasConfig = false;
        try {
          hasUserKey = fs.existsSync(path.join(mountPath, 'user-key.bin'));
          hasHeirKey = fs.existsSync(path.join(mountPath, 'heir-key.bin'));
          hasConfig = fs.existsSync(path.join(mountPath, 'config.bin'));
        } catch (_) {}

        let size = 0;
        let free = 0;
        try {
          if (fs.statfsSync) {
            const stat = fs.statfsSync(mountPath);
            size = stat.bsize * stat.blocks;
            free = stat.bsize * stat.bfree;
          }
        } catch (_) {}

        const isHdd = size > 256 * 1024 * 1024 * 1024;
        drives.push({
          mountPath,
          name: `${name} (${isHdd ? '移动硬盘' : '外部存储'})`,
          volumeLabel: name,
          size,
          freeSpace: free,
          isRemovable: true,
          isExternal: true,
          isSystem: false,
          mediaType: isHdd ? 'UsbHDD' : 'UsbFlash',
          hasUserKey,
          hasHeirKey,
          hasConfig,
        });
      }
    }
  } catch (e) {
    console.error('[Mac Drive Scan Error]', e.message);
  }
  return drives;
}

function scanLinuxDrives() {
  const drives = [];
  const seenPaths = new Set();
  try {
    const lsblkCmd = 'lsblk -J -b -o NAME,MOUNTPOINT,LABEL,RM,HOTPLUG,SIZE,TYPE,FSTYPE,TRAN,MODEL';
    const out = execSync(lsblkCmd, { encoding: 'utf8', timeout: 3500 });
    const data = JSON.parse(out);
    
    function traverse(devices) {
      if (!devices || !Array.isArray(devices)) return;
      for (const dev of devices) {
        if (dev.mountpoint && dev.mountpoint !== '/' && dev.mountpoint !== '/boot' && !dev.mountpoint.startsWith('/snap')) {
          const isUsb = dev.tran === 'usb' || dev.rm === true || dev.rm === '1' || dev.hotplug === true || dev.hotplug === '1' || dev.mountpoint.startsWith('/media') || dev.mountpoint.startsWith('/run/media');
          if (isUsb || dev.mountpoint.startsWith('/media') || dev.mountpoint.startsWith('/run/media')) {
            const label = dev.label || dev.model || dev.name || '外部存储';
            const mp = dev.mountpoint;
            seenPaths.add(mp);

            let hasUserKey = false;
            let hasHeirKey = false;
            let hasConfig = false;
            try {
              hasUserKey = fs.existsSync(path.join(mp, 'user-key.bin'));
              hasHeirKey = fs.existsSync(path.join(mp, 'heir-key.bin'));
              hasConfig = fs.existsSync(path.join(mp, 'config.bin'));
            } catch (_) {}

            const size = Number(dev.size) || 0;
            const isHdd = size > 256 * 1024 * 1024 * 1024;

            drives.push({
              mountPath: mp,
              name: `${label} (${dev.name}) - ${isHdd ? '移动硬盘' : 'U盘'}`,
              volumeLabel: label,
              size,
              freeSpace: 0,
              fileSystem: dev.fstype || 'ext4',
              isRemovable: true,
              isExternal: true,
              isSystem: false,
              mediaType: isHdd ? 'UsbHDD' : 'UsbFlash',
              hasUserKey,
              hasHeirKey,
              hasConfig,
            });
          }
        }
        if (dev.children) traverse(dev.children);
      }
    }
    traverse(data.blockdevices);
  } catch (_) {
    const candidateDirs = ['/media', '/run/media', '/mnt'];
    for (const base of candidateDirs) {
      if (!fs.existsSync(base)) continue;
      try {
        const subList = fs.readdirSync(base);
        for (const sub of subList) {
          const p = path.join(base, sub);
          if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            const inner = fs.readdirSync(p);
            for (const item of inner) {
              const itemPath = path.join(p, item);
              try {
                if (fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && !seenPaths.has(itemPath)) {
                  seenPaths.add(itemPath);
                  drives.push({
                    mountPath: itemPath,
                    name: `${item} (${itemPath}) - 移动介质`,
                    volumeLabel: item,
                    size: 0,
                    freeSpace: 0,
                    fileSystem: 'ext4',
                    isRemovable: true,
                    isExternal: true,
                    isSystem: false,
                    mediaType: 'UsbHDD',
                    hasUserKey: fs.existsSync(path.join(itemPath, 'user-key.bin')),
                    hasHeirKey: fs.existsSync(path.join(itemPath, 'heir-key.bin')),
                    hasConfig: fs.existsSync(path.join(itemPath, 'config.bin')),
                  });
                }
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }
  }
  return drives;
}

function getSettingsFilePath() {
  try {
    return path.join(app.getPath('userData'), 'legacylock_settings.json');
  } catch (_) {
    return path.join(__dirname, '..', 'legacylock_settings.json');
  }
}

// 注册 IPC 通信
function registerIpcHandlers() {
  // 1. 扫描可移动驱动器 (U盘 / 移动硬盘 / 外置SSD，支持 Windows / macOS / Linux)
  ipcMain.handle('vault:scan-usb-drives', async () => {
    try {
      let drives = [];
      if (process.platform === 'win32') {
        drives = scanWindowsDrives();
      } else if (process.platform === 'darwin') {
        drives = scanMacDrives();
      } else {
        drives = scanLinuxDrives();
      }

      // 添加项目目录下的模拟U盘槽位支持 (用于开发/仿真测试)
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

      // 智能排序：有密钥文件 > 外部/移动硬盘 > 本地驱动器
      drives.sort((a, b) => {
        const scoreA = (a.hasUserKey || a.hasHeirKey ? 10 : 0) + (a.isExternal ? 5 : 0) - (a.isSystem ? 5 : 0);
        const scoreB = (b.hasUserKey || b.hasHeirKey ? 10 : 0) + (b.isExternal ? 5 : 0) - (b.isSystem ? 5 : 0);
        return scoreB - scoreA;
      });

      return { success: true, drives, platform: process.platform };
    } catch (err) {
      return { success: false, error: err.message, drives: [] };
    }
  });

  // 1.1 应用配置与主题偏好持久化 (跨重启保留最后一次修改)
  ipcMain.handle('app:get-settings', async () => {
    try {
      const p = getSettingsFilePath();
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return { success: true, settings: data };
      }
    } catch (_) {}
    return { success: true, settings: {} };
  });

  ipcMain.handle('app:save-settings', async (_, newSettings) => {
    try {
      const p = getSettingsFilePath();
      let current = {};
      if (fs.existsSync(p)) {
        try {
          current = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (_) {}
      }
      const updated = { ...current, ...newSettings, lastUpdated: Date.now() };
      fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
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

      // 军规级零填充覆写并安全销毁明文临时文件
      try {
        if (fs.existsSync(tempInput)) {
          const sz = fs.statSync(tempInput).size;
          fs.writeFileSync(tempInput, Buffer.alloc(sz, 0));
          fs.unlinkSync(tempInput);
        }
      } catch (_) {}
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. 双U盘联合解锁
  ipcMain.handle('vault:unlock', async (_, options) => {
    try {
      const { userKey, heirKey, config, vaultPath } = options;
      const vault = vaultPath || getVaultContainerPath();
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

  function getVaultContainerPath() {
    try {
      const userPath = path.join(app.getPath('userData'), 'vault.locked');
      if (fs.existsSync(userPath)) return userPath;
      const projectPath = path.join(__dirname, '..', 'vault.locked');
      if (fs.existsSync(projectPath)) return projectPath;
      return userPath;
    } catch (_) {
      return path.join(__dirname, '..', 'vault.locked');
    }
  }

  // 9. 读取本地容器
  ipcMain.handle('vault:read-container', async () => {
    const vaultPath = getVaultContainerPath();
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
    const vaultPath = getVaultContainerPath();
    try {
      fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, path: vaultPath };
    } catch (e) {
      // 降级保存到项目根目录
      const fallbackPath = path.join(__dirname, '..', 'vault.locked');
      fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, path: fallbackPath };
    }
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
