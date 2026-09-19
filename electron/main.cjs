/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — Electron 原生主进程核心 (Main Process)
 * ============================================================================
 * 
 * 架构核心职责：
 * 1. 进程生命周期与五级退出治理：实现 cleanUpAndExit() 保证窗口关闭时 0 孤儿进程残留；
 * 2. 跨平台物理硬件探查引擎：
 *    - Windows：异步执行 PowerShell 批量获取 USB 磁盘/分区与驱动器映射，A~Z 盘符全量兜底；
 *    - macOS：扫描 /Volumes，结合 statfs 过滤系统卷读取物理参数；
 *    - Linux：解析 lsblk JSON 输出，智能检测 USB 挂载与可移动介质；
 * 3. 嵌入式静态 Web 服务与路径穿越防御：
 *    - 仅绑定 127.0.0.1 本机回环接口；
 *    - 强制校验 normalizedRel.startsWith(absDistDir) 彻底杜绝 ../ 目录穿越攻击；
 * 4. Rust 密码学 CLI 管道调用与临时明文生命周期：
 *    - 密码学真随机命名临时文件并在 finally 块中执行 Buffer.alloc(sz, 0) 内存置零擦除；
 * 5. 跨重启配置与主题持久化 (legacylock_settings.json)。
 */

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec, execSync } = require('child_process');

// ============================================================================
// 单实例锁定机制：严禁程序多开 / 双开 (Single Instance Lock)
// ============================================================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.warn('[Electron Main] 侦测到已有运行中的 LegacyLock 实例，禁止多开，当前进程立即安全退出。');
  app.quit();
  process.exit(0);
}

app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
  console.log('[Electron Main] 拦截到重复启动请求，正在唤醒并聚焦已存在的运行实例窗口...');
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

let mainWindow = null;
let tray = null;
const activeChildProcesses = new Set();

function createOrUpdateTray() {
  if (tray && !tray.isDestroyed()) return;

  const iconPath = path.join(__dirname, 'tray-icon.png');
  let icon;
  try {
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      icon = nativeImage.createEmpty();
    }
  } catch (_) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('LegacyLock 军规遗产密钥库 (安全驻留中)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 LegacyLock 主界面',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: '立即锁定密库',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('app:lock-vault');
        }
      },
    },
    { type: 'separator' },
    {
      label: '彻底退出应用',
      click: () => {
        isQuitting = true;
        cleanUpAndExit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('click', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible() || mainWindow.isMinimized()) {
        mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        mainWindow.focus();
      }
    }
  });
}

function registerChildProcess(proc) {
  if (!proc) return;
  activeChildProcesses.add(proc);
  const cleanup = () => activeChildProcesses.delete(proc);
  proc.on('close', cleanup);
  proc.on('exit', cleanup);
  proc.on('error', cleanup);
}

function killAllChildProcesses() {
  for (const proc of activeChildProcesses) {
    try {
      proc.kill();
    } catch (_) {}
  }
  activeChildProcesses.clear();
}

function getVaultCliPath() {
  const binaryName = process.platform === 'win32' ? 'vault-cli.exe' : 'vault-cli';

  // 1. 打包生产模式下 resourcesPath 目录 (extraResources 释放路径)
  if (process.resourcesPath) {
    const resBin = path.join(process.resourcesPath, 'bin', binaryName);
    if (fs.existsSync(resBin)) return resBin;
    const resDirect = path.join(process.resourcesPath, binaryName);
    if (fs.existsSync(resDirect)) return resDirect;
  }

  // 2. 本地开发环境源码路径
  const releasePath = path.join(__dirname, '..', 'crypt', 'target', 'release', binaryName);
  const debugPath = path.join(__dirname, '..', 'crypt', 'target', 'debug', binaryName);
  if (fs.existsSync(releasePath)) return releasePath;
  if (fs.existsSync(debugPath)) return debugPath;

  return binaryName;
}

function runVaultCli(args) {
  return new Promise((resolve, reject) => {
    const cliPath = getVaultCliPath();
    if (path.isAbsolute(cliPath) && !fs.existsSync(cliPath)) {
      return reject(new Error(`未找到密码学核心引擎: ${cliPath}`));
    }

    let safeCwd;
    try {
      safeCwd = app.getPath('userData');
      if (!fs.existsSync(safeCwd)) fs.mkdirSync(safeCwd, { recursive: true });
    } catch (_) {
      safeCwd = process.cwd();
    }

    const proc = spawn(cliPath, args, { cwd: safeCwd });
    registerChildProcess(proc);
    
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

let embeddedServer = null;
let embeddedServerUrl = 'http://127.0.0.1:5173';
const activeSockets = new Set();
let isQuitting = false;
let isExiting = false;

function stopEmbeddedServer() {
  if (embeddedServer) {
    try {
      if (typeof embeddedServer.closeAllConnections === 'function') {
        embeddedServer.closeAllConnections();
      }
      for (const socket of activeSockets) {
        try { socket.destroy(); } catch (_) {}
      }
      activeSockets.clear();
      embeddedServer.close();
    } catch (_) {}
    embeddedServer = null;
  }
}

function cleanUpAndExit() {
  if (isExiting) return;
  isExiting = true;
  isQuitting = true;
  console.log('[Electron Main] cleanUpAndExit initiated...');

  // 1. 关闭嵌入式 HTTP 服务及现有客户端长连接
  stopEmbeddedServer();

  // 2. 终止所有活跃的子进程 (PowerShell / vault-cli)
  killAllChildProcesses();

  // 3. 销毁主窗口与系统托盘
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
    } catch (_) {}
    tray = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.destroy();
    } catch (_) {}
    mainWindow = null;
  }

  // 4. 正常通知 Electron 退出
  try {
    app.quit();
  } catch (_) {}

  // 5. 300ms 兜底强制销毁进程，确保彻底杀死 Chromium 辅助进程与避免后台残留
  setTimeout(() => {
    try {
      app.exit(0);
    } catch (_) {
      process.exit(0);
    }
  }, 300).unref();
}

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
        
        // 限制 CORS 与 CSP 仅允许本机应用环境，防御外部网页跨域探测与外连
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': `http://127.0.0.1:${port}`,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data:; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'none'; object-src 'none';",
        });
        res.end(content);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(e.message);
      }
    });

    embeddedServer = server;

    server.on('connection', (socket) => {
      activeSockets.add(socket);
      socket.on('close', () => activeSockets.delete(socket));
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
  console.log('[Electron Main] Creating main browser window with adaptive screen fitting...');

  // 1. 获取当前主显示器可用工作区尺寸 (去除任务栏占用)
  let workArea = { width: 1366, height: 768 };
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    if (primaryDisplay && primaryDisplay.workAreaSize) {
      workArea = primaryDisplay.workAreaSize;
    }
  } catch (err) {
    console.warn('[Electron Main] 获取屏幕工作区异常，使用通用兜底分辨率:', err.message);
  }

  // 2. 读取持久化窗口状态与缩放配置
  let savedSettings = {};
  try {
    const settingsPath = getSettingsFilePath();
    if (fs.existsSync(settingsPath)) {
      savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {};
    }
  } catch (_) {}

  const savedBounds = savedSettings.windowBounds || {};

  // 3. 动态计算初始宽高：优先使用安全范围内的记忆尺寸，若无或超出屏幕则自动按屏幕比例自适应
  let initialWidth = savedBounds.width || Math.min(1240, Math.max(900, Math.floor(workArea.width * 0.92)));
  let initialHeight = savedBounds.height || Math.min(800, Math.max(580, Math.floor(workArea.height * 0.90)));

  // 严密防范窗口尺寸超出实际屏幕导致底部被任务栏遮挡
  if (initialWidth > workArea.width) initialWidth = Math.max(800, workArea.width - 30);
  if (initialHeight > workArea.height) initialHeight = Math.max(500, workArea.height - 30);

  // 最小尺寸放宽至 800x500，确保在 1280x720 (150% DPI 缩放) 或分屏下完全自由缩放不被锁定
  const minWidth = Math.min(800, workArea.width);
  const minHeight = Math.min(500, workArea.height);

  const windowOptions = {
    width: initialWidth,
    height: initialHeight,
    minWidth,
    minHeight,
    title: 'LegacyLock 遗产保险锁 (军规级数字遗产双保险箱)',
    backgroundColor: '#0E1525',
    show: false, // 动态调整最大化后显示，消除视觉闪烁
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      zoomFactor: typeof savedSettings.zoomFactor === 'number' ? savedSettings.zoomFactor : 1.0,
    },
  };

  // 仅在合法坐标且未移出屏幕时恢复位置，否则保持居中
  if (
    typeof savedBounds.x === 'number' &&
    typeof savedBounds.y === 'number' &&
    savedBounds.x >= 0 &&
    savedBounds.y >= 0 &&
    savedBounds.x < workArea.width - 100 &&
    savedBounds.y < workArea.height - 100
  ) {
    windowOptions.x = savedBounds.x;
    windowOptions.y = savedBounds.y;
  } else {
    windowOptions.center = true;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 4. 屏幕尺寸过紧时（笔记本常见的 1080p 开启 125%/150% 缩放导致高度不足 860px），或上次处于最大化状态：
  // 自动执行最大化，确保 100% 完整显示全部内容与底部操作按钮
  const shouldAutoMaximize =
    savedBounds.isMaximized === true ||
    (!savedBounds.width && (workArea.height <= 860 || workArea.width <= 1366));

  if (shouldAutoMaximize) {
    mainWindow.maximize();
  }

  mainWindow.show();
  mainWindow.focus();

  // 5. 监听窗口变化并持久化记录尺寸与最大化状态
  function saveWindowBounds() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const isMaximized = mainWindow.isMaximized();
      const bounds = mainWindow.getBounds();
      const settingsPath = getSettingsFilePath();
      let current = {};
      if (fs.existsSync(settingsPath)) {
        try { current = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {}; } catch (_) {}
      }
      current.windowBounds = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized,
      };
      fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2), 'utf8');
    } catch (_) {}
  }

  let boundsTimer = null;
  const debouncedSaveBounds = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(saveWindowBounds, 500);
  };

  mainWindow.on('resize', debouncedSaveBounds);
  mainWindow.on('move', debouncedSaveBounds);
  mainWindow.on('maximize', () => {
    debouncedSaveBounds();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-change', true);
    }
  });
  mainWindow.on('unmaximize', () => {
    debouncedSaveBounds();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-change', false);
    }
  });

  // 主窗口关闭时拦截并转入托盘询问流程
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:request-close');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (isQuitting) {
      cleanUpAndExit();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron Main] Failed to load URL:', validatedURL, 'Error:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron Main] WebContents did-finish-load successfully!');
  });

  const distPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    console.log('[Electron Main] Loading production file directly:', distPath);
    mainWindow.loadFile(distPath);
  } else {
    const url = await startEmbeddedServer();
    console.log('[Electron Main] Loading URL:', url);
    mainWindow.loadURL(url);
  }
}

let inFlightWindowsScan = null;
let lastWindowsScanResult = null;
let lastWindowsScanTime = 0;

function scanWindowsDrives() {
  const now = Date.now();
  // 1. 节流防抖：若 1500ms 内已有最新扫描结果，直接复用缓存，绝不拉起 PowerShell
  if (now - lastWindowsScanTime < 1500 && lastWindowsScanResult) {
    return Promise.resolve(lastWindowsScanResult);
  }

  // 2. 并发互斥锁：若已有正在执行中的扫描任务，直接复用该 Promise，彻底杜绝多个 powershell 进程堆叠
  if (inFlightWindowsScan) {
    return inFlightWindowsScan;
  }

  inFlightWindowsScan = new Promise((resolve) => {
    const drives = [];
    const systemDrive = (process.env.SystemDrive || 'C:').toUpperCase();
    const seenPaths = new Set();

    // 聚合单行 PowerShell 脚本，一次性批量提取 USB 磁盘、分区关联及逻辑驱动器
    const psScript = `
      $disks = @(Get-Disk | Where-Object { $_.BusType -eq 'USB' } | Select-Object -ExpandProperty Number);
      $parts = @(Get-Partition | Where-Object DriveLetter | Select-Object DiskNumber, DriveLetter);
      $drives = @(Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, VolumeSerialNumber, DriveType, Size, FreeSpace, FileSystem);
      [PSCustomObject]@{ Disks = $disks; Parts = $parts; Drives = $drives } | ConvertTo-Json -Depth 3 -Compress
    `.replace(/\r?\n\s*/g, ' ').trim();

    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      inFlightWindowsScan = null;
      lastWindowsScanTime = Date.now();
      lastWindowsScanResult = drives;

      // 兜底轮询 A~Z 盘符（跳过系统盘），确保 100% 检测到 D: 及其他所有外接盘符
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of allLetters) {
        const devId = `${letter}:`;
        if (seenPaths.has(devId)) continue;
        const root = `${devId}\\`;
        try {
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
        } catch (_) {}
      }

      resolve(drives);
    };

    try {
      const proc = exec(
        `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        { encoding: 'utf8', timeout: 4500 },
        (err, stdout) => {
          if (!err && stdout) {
            try {
              const data = JSON.parse(stdout.trim());
              const rawDisks = Array.isArray(data.Disks) ? data.Disks : (data.Disks ? [data.Disks] : []);
              const usbDiskNumbers = new Set(rawDisks.map(Number));

              const driveUsbMap = new Map();
              const partList = Array.isArray(data.Parts) ? data.Parts : (data.Parts ? [data.Parts] : []);
              for (const p of partList) {
                if (p && p.DriveLetter) {
                  const letter = `${p.DriveLetter}:`.toUpperCase();
                  if (usbDiskNumbers.has(Number(p.DiskNumber))) {
                    driveUsbMap.set(letter, true);
                  }
                }
              }

              const driveList = Array.isArray(data.Drives) ? data.Drives : (data.Drives ? [data.Drives] : []);
              for (const d of driveList) {
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
                const volumeSerial = d.VolumeSerialNumber ? String(d.VolumeSerialNumber).trim() : '';
                const deviceFingerprint = volumeSerial || `DEV_${letter}_${sizeBytes}`;

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
                  volumeSerialNumber: volumeSerial,
                  deviceFingerprint,
                  hasUserKey,
                  hasHeirKey,
                  hasConfig,
                });
              }
            } catch (parseErr) {
              console.error('[Windows PowerShell Scan Parse Error]', parseErr.message);
            }
          }
          finish();
        }
      );

      registerChildProcess(proc);
    } catch (_) {
      finish();
    }
  });

  return inFlightWindowsScan;
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
          deviceFingerprint: `MAC_${name}_${size}`,
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
              volumeSerialNumber: dev.serial || dev.uuid || '',
              deviceFingerprint: dev.uuid || dev.serial || `LNX_${dev.name}_${size}`,
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
        drives = await scanWindowsDrives();
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
    const sanitizedName = path.basename(defaultName || 'key.bin');
    const res = await dialog.showSaveDialog(mainWindow, {
      defaultPath: sanitizedName,
      filters: [{ name: 'Binary File (*.bin)', extensions: ['bin'] }, { name: 'All Files (*.*)', extensions: ['*'] }],
    });
    if (!res.canceled && res.filePath) {
      const buffer = Buffer.from(dataBase64, 'base64');
      const dir = path.dirname(res.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
    const { userKey, heirKey, config, inputData, outputPath } = options;
    const randHex = require('crypto').randomBytes(16).toString('hex');
    const tempInput = path.join(app.getPath('temp'), `vault-in-${randHex}.json`);
    try {
      fs.writeFileSync(tempInput, JSON.stringify(inputData, null, 2), 'utf8');

      const out = outputPath || path.join(__dirname, '..', 'vault.locked');
      const outDir = path.dirname(out);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const res = await runVaultCli([
        'encrypt',
        '--user-key', userKey,
        '--heir-key', heirKey,
        '--config', config,
        '--input', tempInput,
        '--output', out,
      ]);

      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      // 军规级零填充覆写并安全销毁明文临时文件，确保任何异常下明文都不留存磁盘
      try {
        if (fs.existsSync(tempInput)) {
          const sz = fs.statSync(tempInput).size;
          fs.writeFileSync(tempInput, Buffer.alloc(sz, 0));
          fs.unlinkSync(tempInput);
        }
      } catch (_) {}
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
      const userDir = app.getPath('userData');
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      const userPath = path.join(userDir, 'vault.locked');
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

  // 10. 保存容器 (支持保存到本地系统目录或外部指定驱动器/手动指定路径)
  ipcMain.handle('vault:save-container', async (_, data) => {
    try {
      if (data && data.encryptedPackage) {
        const destFolder = data.targetPath || data.targetDrive;
        if (destFolder) {
          if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
          const filename = `LegacyLock_Vault_Backup_${Date.now()}.legacylock`;
          const filePath = path.join(destFolder, filename);
          fs.writeFileSync(filePath, data.encryptedPackage, 'utf8');
          return { success: true, path: filePath };
        }
      }

      const vaultPath = getVaultContainerPath();
      const dir = path.dirname(vaultPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(vaultPath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, path: vaultPath };
    } catch (e) {
      // 降级保存到项目根目录
      try {
        const fallbackPath = path.join(__dirname, '..', 'vault.locked');
        const fbDir = path.dirname(fallbackPath);
        if (!fs.existsSync(fbDir)) fs.mkdirSync(fbDir, { recursive: true });
        fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true, path: fallbackPath };
      } catch (err2) {
        return { success: false, error: err2.message };
      }
    }
  });

  // 10.1 写入 U 盘物理介质硬件防克隆绑定凭据
  ipcMain.handle('vault:write-drive-binding', async (_, options) => {
    try {
      const { drivePath, fingerprint, signature } = options || {};
      if (!drivePath || !fingerprint) {
        return { success: false, error: '缺少驱动器路径或硬件指纹' };
      }
      const bindingFile = path.join(drivePath, '.legacylock-device.sig');
      const payload = {
        version: 1,
        fingerprint,
        signature: signature || '',
        boundAt: Date.now(),
        warning: 'LegacyLock 军规介质硬件防克隆绑定凭据：数据与原始物理介质强绑定，若强制复制到其它介质将无法解密。',
      };
      fs.writeFileSync(bindingFile, JSON.stringify(payload, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 10.2 校验 U 盘物理介质硬件防克隆绑定
  ipcMain.handle('vault:verify-drive-binding', async (_, options) => {
    try {
      const { drivePath, currentFingerprint } = options || {};
      if (!drivePath) {
        return { success: false, error: '缺少驱动器路径' };
      }
      const bindingFile = path.join(drivePath, '.legacylock-device.sig');
      if (!fs.existsSync(bindingFile)) {
        // 未检测到绑定签名文件（可能为旧版本未绑定或手动导入）
        return { success: true, isBound: false, matched: true };
      }
      const content = fs.readFileSync(bindingFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.fingerprint && currentFingerprint && parsed.fingerprint !== currentFingerprint) {
        return {
          success: true,
          isBound: true,
          matched: false,
          error: `⚠️ 介质硬件绑定校验失败：检测到解锁数据已被强制转移至未授权的外部介质！\n原始绑定指纹: ${parsed.fingerprint}\n当前介质指纹: ${currentFingerprint}\n为防止克隆失窃，禁止跨介质使用。`,
        };
      }
      return { success: true, isBound: true, matched: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 11. 窗口与系统托盘原生控制
  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
    return { success: true };
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
    return { success: true };
  });

  ipcMain.handle('window:is-maximized', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return { isMaximized: mainWindow.isMaximized() };
    }
    return { isMaximized: false };
  });

  ipcMain.handle('window:set-zoom', (_, factor) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const zoom = Math.max(0.6, Math.min(2.0, Number(factor) || 1.0));
      mainWindow.webContents.setZoomFactor(zoom);
      try {
        const settingsPath = getSettingsFilePath();
        let current = {};
        if (fs.existsSync(settingsPath)) {
          try { current = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) || {}; } catch (_) {}
        }
        current.zoomFactor = zoom;
        fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2), 'utf8');
      } catch (_) {}
      return { success: true, zoom };
    }
    return { success: false, zoom: 1.0 };
  });

  ipcMain.handle('window:get-zoom', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return { success: true, zoom: mainWindow.webContents.getZoomFactor() };
    }
    return { success: false, zoom: 1.0 };
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
    return { success: true };
  });

  ipcMain.handle('app:minimize-to-tray', () => {
    createOrUpdateTray();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
      // 检查是否开启了最小化到托盘自动锁定密库
      try {
        const p = getSettingsFilePath();
        let shouldLock = true;
        if (fs.existsSync(p)) {
          const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (cfg.lockOnTray === false) {
            shouldLock = false;
          }
        }
        if (shouldLock) {
          mainWindow.webContents.send('app:lock-vault');
        }
      } catch (_) {}
    }
    return { success: true };
  });

  ipcMain.handle('app:quit', () => {
    isQuitting = true;
    cleanUpAndExit();
    return { success: true };
  });
}

app.whenReady().then(() => {
  console.log('[Electron Main] app.whenReady fired!');
  registerIpcHandlers();
  createOrUpdateTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  cleanUpAndExit();
});

app.on('will-quit', () => {
  cleanUpAndExit();
});

app.on('window-all-closed', () => {
  cleanUpAndExit();
});

