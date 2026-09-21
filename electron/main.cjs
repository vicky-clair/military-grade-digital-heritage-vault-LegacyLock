"use strict";
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  powerMonitor,
  session,
  clipboard,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const core = require("./vault-core.cjs");
const { VaultStore } = require("./vault-store.cjs");
const { VaultController } = require("./vault-controller.cjs");
const { Preferences } = require("./vault-preferences.cjs");
let preferences, clipboardTimer, copiedText;
function clearCopiedText() {
  clearTimeout(clipboardTimer);
  try {
    if (copiedText !== undefined && clipboard.readText() === copiedText)
      clipboard.clear();
  } catch { /* Clipboard availability must not prevent locking the vault. */ }
  copiedText = undefined;
}
let win,
  store,
  controller,
  timer,
  closing = false,
  polling = false;
const entry = path.join(__dirname, "..", "dist", "index.html"),
  entryUrl = pathToFileURL(entry).href;
function lock() {
  clearCopiedText();
  controller?.lock();
  if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
    try {
      win.webContents.send("secure:locked");
    } catch {
      /* Renderer may already be gone. */
    }
  }
}
function sender(event) {
  if (
    !win ||
    event.sender !== win.webContents ||
    event.senderFrame !== win.webContents.mainFrame ||
    event.senderFrame.url !== entryUrl
  )
    core.fail("UNTRUSTED_SENDER");
}
function register(name, fn) {
  ipcMain.handle("secure:" + name, async (event, ...args) => {
    try {
      sender(event);
      if (Buffer.byteLength(JSON.stringify(args)) > core.MAX_BYTES)
        core.fail("INVALID_SIZE");
      return { ok: true, value: await fn(...args) };
    } catch (e) {
      if (e.commitUncertain) lock();
      return {
        ok: false,
        error: e instanceof core.VaultError ? e.code : "OPERATION_FAILED",
      };
    }
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    win?.show();
    win?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      if (!fs.existsSync(entry)) {
        dialog.showErrorBox(
          "LegacyLock",
          "缺少应用构建文件。请运行 npm run build 后再启动；不会连接外部开发服务器。",
        );
        app.quit();
        return;
      }
      store = new VaultStore(
        path.join(app.getPath("userData"), "vault-v3.llvault"),
      );
      preferences = new Preferences(
        path.join(app.getPath("userData"), "appearance-v1.json"),
        store,
      );
      await preferences.load();
      store.beforeAssetWrite = () => preferences.assertWritable();
      controller = new VaultController(store, {
        open: async (title) => {
          const r = await dialog.showOpenDialog(win, {
            title,
            properties: ["openFile"],
            filters: [
              {
                name: "LegacyLock",
                extensions: ["llvault", "legacylock", "json"],
              },
            ],
          });
          return r.canceled ? null : r.filePaths[0];
        },
        save: async (title, defaultPath) => {
          const r = await dialog.showSaveDialog(win, {
            title,
            defaultPath,
            filters: [{ name: "LegacyLock", extensions: ["llvault"] }],
          });
          return r.canceled ? null : r.filePath;
        },
      });
      register("status", async () => ({
        ...(await store.status()),
        preferencesWarning: !!preferences.loadWarning,
      }));
      register("newSecret", () => core.newSecret());
      let nextAttempt = 0;
      const authenticate =
        (fn) =>
        async (...args) => {
          if (Date.now() < nextAttempt) core.fail("TRY_LATER");
          nextAttempt = Date.now() + 1500;
          return fn(...args);
        };
      register("initialize", (p, s) => store.initialize(p, s));
      register(
        "unlock",
        authenticate(async (p, s) => {
          const view = await store.unlock(p, s);
          controller.recoveryPair = null;
          return { view };
        }),
      );
      register("lock", () => lock());
      register("saveItem", (v) => {
        preferences.assertWritable();
        return store.saveItem(v);
      });
      register("deleteItem", (id) => {
        preferences.assertWritable();
        return store.deleteItem(id);
      });
      register("preferences", () => preferences.value);
      register("setPreferences", (v) => preferences.set(v));
      register("windowControl", (action) => {
        if (action === "minimize") win.minimize();
        else if (action === "maximize")
          win.isMaximized() ? win.unmaximize() : win.maximize();
        else if (action === "close") win.close();
        else core.fail("INVALID_SETTINGS");
      });
      register("copy", (text) => {
        if (!store.session) core.fail("LOCKED");
        if (typeof text !== "string" || text.length > 100000)
          core.fail("INVALID_SIZE");
        clearCopiedText();
        clipboard.writeText(text);
        copiedText = text;
        clipboardTimer = setTimeout(clearCopiedText, 30000);
      });
      register("settings", (v) => store.settings(v));
      for (const method of [
        "scan",
        "provision",
        "sync",
        "recover",
        "importOwner",
        "export",
        "credentials",
        "health",
      ])
        register(method, (...args) => controller[method](...args));
      register("migrate", (...args) =>
        require("./vault-migrate.cjs").migrate(controller, ...args),
      );
      const ses = session.defaultSession;
      ses.setPermissionRequestHandler((_wc, _permission, callback) =>
        callback(false),
      );
      ses.setPermissionCheckHandler(() => false);
      ses.webRequest.onBeforeRequest((details, callback) => {
        let allowed = false;
        try {
          const u = new URL(details.url);
          allowed =
            u.protocol === "file:" &&
            (u.href === entryUrl ||
              u.href.startsWith(
                pathToFileURL(path.join(__dirname, "..", "dist", "assets"))
                  .href + "/",
              ));
        } catch {}
        callback({ cancel: !allowed });
      });
      win = new BrowserWindow({
        width: 1180,
        height: 800,
        minWidth: 640,
        minHeight: 460,
        show: false,
        backgroundColor: "#0b1220",
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          devTools: !app.isPackaged,
          spellcheck: false,
        },
      });
      win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      win.webContents.on("will-navigate", (event) => event.preventDefault());
      win.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      win.webContents.on("before-input-event", (_event, input) => {
        if (store.session && input.type === "keyDown")
          store.lastActivity = Date.now();
      });
      ipcMain.on("secure:activity", (event) => {
        try {
          sender(event);
          if (store.session) store.lastActivity = Date.now();
        } catch {}
      });
      win.webContents.on("render-process-gone", lock);
      win.webContents.on("did-start-loading", lock);
      win.on("close", (event) => {
        if (closing) return;
        event.preventDefault();
        lock();
        store.queue.finally(() => {
          closing = true;
          app.quit();
        });
      });
      powerMonitor.on("suspend", lock);
      powerMonitor.on("lock-screen", lock);
      timer = setInterval(async () => {
        // Idle locking must not wait for a slow OS media scan to finish.
        if (
          store.session &&
          Date.now() - store.lastActivity >
            store.session.data.settings.autoLockMinutes * 60000
        )
          lock();
        if (polling) return;
        polling = true;
        try {
          if (!(await controller.checkDevices())) lock();
        } finally {
          polling = false;
        }
      }, 2500);
      await win.loadFile(entry);
      win.show();
    })
    .catch(() => {
      dialog.showErrorBox(
        "LegacyLock",
        "启动失败。原密库文件保持不变，请检查应用文件和数据目录权限。",
      );
      app.quit();
    });
  app.on("before-quit", (event) => {
    if (store && !closing) {
      event.preventDefault();
      lock();
      store.queue.finally(() => {
        closing = true;
        app.quit();
      });
    }
  });
  app.on("will-quit", () => {
    clearInterval(timer);
    lock();
  });
  app.on("window-all-closed", () => app.quit());
}
