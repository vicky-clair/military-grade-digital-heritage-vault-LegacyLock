import { useEffect, useRef, useState } from "react";
import { LockKeyhole, ShieldCheck, Usb } from "lucide-react";
import { ItemModal } from "./components/ItemModal";
import { Sidebar } from "./components/Sidebar";
import { RightContentArea } from "./components/RightContentArea";
import { CategoryPickerModal } from "./components/CategoryPickerModal";
import { SubscriptionModal } from "./components/SubscriptionModal";
import { THEMES, getTheme } from "./services/themes";
import { useI18n } from "./services/i18n";
import {
  call,
  legacySnapshot,
  type Preferences,
  type Drive,
  type Settings,
  type Status,
  type View,
} from "./services/vaultClient";
import type { NavCategoryType, VaultCategory, VaultItem } from "./types";
import "./secure-app.css";
import "./restored-app.css";

type Action =
  | "unlock"
  | "export"
  | "provision"
  | "credentials"
  | "migrate-file"
  | "migrate-local";
type Result = {
  view?: View;
  canceled?: boolean;
  path?: string;
  paths?: string[];
  revision?: number;
};
export default function App() {
  const { setLanguage } = useI18n();
  const [status, setStatus] = useState<Status | null>(null),
    [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [nav, setNav] = useState<NavCategoryType>("all");
  const [category, setCategory] = useState<VaultCategory>("login");
  const [picker, setPicker] = useState(false),
    [subscription, setSubscription] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    theme: "royal_violet",
    zoom: 1,
    subscriptionDemo: "trial",
  });
  const currentTheme = getTheme(preferences.theme);
  const [editor, setEditor] = useState<VaultItem | null | undefined>(undefined);
  const [drives, setDrives] = useState<Drive[]>([]),
    [primary, setPrimary] = useState(""),
    [secondary, setSecondary] = useState("");
  const [password, setPassword] = useState(""),
    [secret, setSecret] = useState(""),
    [repeat, setRepeat] = useState(""),
    [backed, setBacked] = useState(false);
  const [newPassword, setNewPassword] = useState(""),
    [newSecret, setNewSecret] = useState(""),
    [newRepeat, setNewRepeat] = useState("");
  const [action, setAction] = useState<Action | null>(null),
    [settings, setSettings] = useState<Settings>({
      autoLockMinutes: 15,
      heirName: "",
      heirNotes: "",
    });
  const [importMode, setImportMode] = useState(false),
    [backupRevision, setBackupRevision] = useState<number | null>(null);
  const epoch = useRef(0),
    pending = useRef(false);
  const lastError = useRef("");
  const credentialDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (action && !credentialDialog.current?.open)
      credentialDialog.current?.showModal();
  }, [action]);
  const owner = view?.role === "OWNER",
    ready = !!primary && !!secondary && primary !== secondary;
  const clearCredentials = () => {
    setPassword("");
    setSecret("");
    setRepeat("");
    setNewPassword("");
    setNewSecret("");
    setNewRepeat("");
    setBacked(false);
  };
  const clear = () => {
    epoch.current++;
    setView(null);
    setEditor(undefined);
    setAction(null);
    setNav("all");
    setPicker(false);
    setSubscription(false);
    setNotice("");
    setError("");
    setSettings({ autoLockMinutes: 15, heirName: "", heirNotes: "" });
    clearCredentials();
  };
  useEffect(() => {
    setLanguage("zh");
    if (!window.vaultAPI) return;
    void call<Preferences>("preferences")
      .then(setPreferences)
      .catch((e) => setError(e.message));
    const off = window.vaultAPI.onLocked(() => {
      clear();
      void call<Status>("status")
        .then(setStatus)
        .catch((e) => setError(e.message));
    });
    void call<Status>("status")
      .then(setStatus)
      .catch((e) => setError(e.message));
    let last = 0;
    const activity = () => {
      if (Date.now() - last > 5000) {
        window.vaultAPI?.activity();
        last = Date.now();
      }
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    return () => {
      off();
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, []);
  async function perform<T>(
    fn: () => Promise<T>,
    message?: string,
  ): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const started = epoch.current;
    try {
      const value = await fn();
      if (started !== epoch.current) return false;
      const r = value as Result & Partial<View>;
      if (r?.canceled) return false;
      const next = r?.view || (r?.role && r?.items ? (r as View) : null);
      if (next) {
        setView(next);
        setSettings(next.settings);
        setStatus({ exists: true, recovery: next.recovery });
        setImportMode(false);
      }
      if (message)
        setNotice(
          message +
            (r?.path ? " " + r.path : r?.paths ? " " + r.paths.join("；") : ""),
        );
      return true;
    } catch (e) {
      if (started === epoch.current) {
        lastError.current = e instanceof Error ? e.message : "操作失败";
        setError(lastError.current);
      }
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function updatePreferences(next: Preferences) {
    const started = epoch.current;
    return perform(async () => {
      const saved = await call<Preferences>("setPreferences", next);
      if (started === epoch.current) setPreferences(saved);
      return {};
    }, "界面设置已保存。");
  }
  const selectNav = (next: NavCategoryType) => {
    if (!owner && (next === "settings" || next === "import_export")) {
      openAction("unlock");
      return;
    }
    setNav(next);
  };
  const add = (c?: VaultCategory) => {
    if (busy) return;
    if (!owner) {
      openAction("unlock");
      return;
    }
    if (preferences.subscriptionDemo === "expired") {
      setSubscription(true);
      return;
    }
    if (c) {
      setCategory(c);
      setEditor(null);
    } else setPicker(true);
  };
  const lock = () => {
    clear();
    void call("lock").catch((e) => setError(e.message));
  };
  const openAction = (a: Action) => {
    clearCredentials();
    setEditor(undefined);
    setError("");
    setAction(a);
  };
  const generate = async (newValue = false) => {
    await perform(async () => {
      const s = await call<string>("newSecret");
      if (newValue) setNewSecret(s);
      else setSecret(s);
      setBacked(false);
      return {};
    });
  };
  const scan = () =>
    perform(async () => {
      const d = await call<Drive[]>("scan");
      setDrives(d);
      if (!d.some((x) => x.token === primary)) setPrimary("");
      if (!d.some((x) => x.token === secondary)) setSecondary("");
      return {};
    }, "已扫描实际 USB 设备。");
  const usbControls = (
    <div className="secure-usb">
      <div className="secure-row">
        <h3>
          <Usb size={18} />双 U 盘
        </h3>
        <button disabled={busy} onClick={() => void scan()}>
          扫描设备
        </button>
      </div>
      <p>
        请选择两个不同的物理 USB
        设备。密钥文件可复制，不具备不可克隆的硬件保护。
      </p>
      <div className="secure-two">
        {(["主盘 A", "副盘 B"] as const).map((label, i) => (
          <label key={label}>
            {label}
            <select
              disabled={busy}
              value={i ? secondary : primary}
              onChange={(e) => (i ? setSecondary : setPrimary)(e.target.value)}
            >
              <option value="">请选择已扫描的设备</option>
              {drives.map((d) => (
                <option key={d.token} value={d.token}>
                  {d.label || "USB"} · {d.root}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {!drives.length && (
        <p className="secure-hint">
          尚无设备列表。插入 U 盘后点击“扫描设备”；不会显示模拟设备。
        </p>
      )}
    </div>
  );
  const secretInput = (
    value: string,
    set: (s: string) => void,
    label = "安全密钥",
  ) => (
    <label>
      {label}
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder="LL3-…（密码与密钥必须同时提供）"
      />
    </label>
  );
  const newFields = (
    <>
      <label>
        新密码（至少 12 位）
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </label>
      <label>
        再次输入新密码
        <input
          type="password"
          autoComplete="new-password"
          value={newRepeat}
          onChange={(e) => setNewRepeat(e.target.value)}
        />
      </label>
      <label>
        新安全密钥
        <textarea readOnly value={newSecret} rows={3} />
      </label>
      <button type="button" disabled={busy} onClick={() => void generate(true)}>
        生成新的随机安全密钥
      </button>
      <label className="secure-check">
        <input
          type="checkbox"
          checked={backed}
          onChange={(e) => setBacked(e.target.checked)}
        />
        我已将新安全密钥保存到独立安全位置。重新生成后须重新备份。
      </label>
    </>
  );
  async function submitAction() {
    let success = false;
    if (action === "unlock")
      success = await perform(
        () => call("unlock", password, secret),
        "已验证两项凭据，进入所有者会话。",
      );
    if (action === "export")
      success = await perform(
        () => call("export", password, secret),
        "已写入并校验加密备份：",
      );
    if (action === "provision")
      success = await perform(
        () => call("provision", primary, secondary, password, secret),
        "两盘密钥和密库备份已写入并校验：",
      );
    if (action === "credentials" || action?.startsWith("migrate-")) {
      if (
        newPassword.length < 12 ||
        newPassword !== newRepeat ||
        !newSecret ||
        !backed
      ) {
        setError("请确认新密码一致且至少 12 位，并备份新密钥。");
        return;
      }
      if (action === "credentials")
        success = await perform(
          () => call("credentials", password, secret, newPassword, newSecret),
          "本机凭据已更新。请重新导出备份并同步两盘；旧备份仍使用旧凭据。",
        );
      else
        success = await perform(
          async () =>
            call(
              "migrate",
              action === "migrate-file" ? "file" : "local",
              password,
              secret,
              newPassword,
              newSecret,
              action === "migrate-local" ? await legacySnapshot() : undefined,
            ),
          "旧资产已迁移为新的 LVCF 3 密库，原数据保留；请重新配置两盘。",
        );
    }
    if (success) {
      setAction(null);
      clearCredentials();
    }
  }
  const appearancePanel = (
    <section className="secure-card appearance-panel">
      <h2>外观与背景</h2>
      <p>保留原来的五套渐变背景；保存后下次启动继续使用。</p>
      <div className="appearance-themes">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            disabled={busy}
            aria-pressed={preferences.theme === theme.id}
            onClick={() =>
              void updatePreferences({ ...preferences, theme: theme.id })
            }
            style={{ background: theme.previewGradient }}
          >
            {theme.name}
          </button>
        ))}
      </div>
      <label>
        界面缩放
        <select
          value={preferences.zoom}
          disabled={busy}
          onChange={(e) =>
            void updatePreferences({
              ...preferences,
              zoom: Number(e.target.value),
            })
          }
        >
          {[0.85, 1, 1.15, 1.25].map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)}%
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} onClick={() => setSubscription(true)}>
        付费订阅 · 测试体验
      </button>
    </section>
  );
  const settingsPanel = owner && view && (
    <div className="secure-controls restored-settings">
      {appearancePanel}
      <section className="secure-card">
        <h2>应用与继承设置</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(() => call("settings", settings), "设置已加密保存。");
          }}
        >
          <label>
            无操作自动锁定
            <select
              value={settings.autoLockMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoLockMinutes: Number(e.target.value),
                })
              }
            >
              {[1, 5, 15, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n} 分钟
                </option>
              ))}
            </select>
          </label>
          <label>
            继承人姓名
            <input
              maxLength={200}
              value={settings.heirName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  heirName: e.target.value,
                })
              }
            />
          </label>
          <label>
            继承说明
            <textarea
              maxLength={10000}
              rows={4}
              value={settings.heirNotes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  heirNotes: e.target.value,
                })
              }
            />
          </label>
          <button className="primary" disabled={busy}>
            保存设置
          </button>
        </form>
        <hr />
        <h3>密码、密钥与导出</h3>
        <p>
          加密备份使用本机的密码和安全密钥。更新凭据后，需要重新导出；旧备份不会自动改变。
        </p>
        <button disabled={busy} onClick={() => openAction("export")}>
          验证凭据并导出加密备份
        </button>
        <button disabled={busy} onClick={() => openAction("credentials")}>
          更换密码和安全密钥
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void perform(
              () => call("health"),
              "当前磁盘签名及会话完整性校验通过。此结果不代表离线 U 盘已更新。",
            )
          }
        >
          校验本机密库
        </button>
      </section>
    </div>
  );
  const backupPanel = owner && view && (
    <div className="secure-controls restored-settings">
      <section className="secure-card">
        <h2>双 U 盘配置与备份</h2>
        {usbControls}
        <p>
          {view.recovery
            ? "已配置恢复密钥。重新配置会生成新代次并更换数据密钥；新数据需用新两盘恢复。"
            : "尚未配置。两盘配置成功后，继承人才具备只读恢复能力。"}
        </p>
        <button
          disabled={busy || !ready}
          onClick={() => openAction("provision")}
        >
          {view.recovery ? "重新配置 / 更换两盘" : "配置主、副 U 盘"}
        </button>
        <button
          className="primary"
          disabled={busy || !ready || !view.recovery}
          onClick={() =>
            void perform(async () => {
              const r = await call<Result>("sync", primary, secondary);
              setBackupRevision(r.revision || null);
              return r;
            }, "当前密库已同步到两盘：")
          }
        >
          同步当前密库到两盘
        </button>
        <p className="secure-hint">
          本机版本 {view.revision}；
          {backupRevision === view.revision
            ? "本次会话已确认两盘同步此版本。"
            : "未确认两盘包含此版本，请点击同步。"}{" "}
          数据编辑只保存本机，离线 U 盘不会自动更新。
        </p>
        <p>
          请分开保管两盘。更换设备不需要格式化：选择两块新设备重新配置即可；旧副本仍可能打开历史数据。
        </p>
      </section>
      <section className="secure-card">
        <h2>加密备份导入与导出</h2>
        <p>
          备份使用当前密码与安全密钥；在其他电脑上可用所有者凭据导入，或用两盘只读恢复。
        </p>
        <button disabled={busy} onClick={() => openAction("export")}>
          验证凭据并导出加密备份
        </button>
        <button
          disabled={busy}
          onClick={() => {
            lock();
            setImportMode(true);
          }}
        >
          锁定并进入导入
        </button>
      </section>
    </div>
  );
  if (!window.vaultAPI)
    return (
      <main className="secure-app">
        <section className="secure-card secure-welcome">
          <LockKeyhole />
          <h1>LegacyLock 桌面密库</h1>
          <p>
            浏览器模式只用于界面开发。真实密库、导入、U
            盘和加密设置仅在桌面应用中可用。
          </p>
          <p>运行 npm run build，再运行 npm run electron。</p>
        </section>
      </main>
    );
  return (
    <main
      className={view ? "restored-app app-shell" : "secure-app restored-lock"}
      aria-busy={busy}
      style={
        {
          background: currentTheme.mainStyle.background,
          "--vault-card-bg": currentTheme.mainStyle.cardBg,
          "--vault-accent": currentTheme.primaryAccent,
        } as React.CSSProperties
      }
    >
      {view && (
        <Sidebar
          selectedNav={nav}
          onSelectNav={selectNav}
          totalCount={view.items.length}
          theme={currentTheme}
          categoryCounts={view.items.reduce<Record<string, number>>(
            (counts, item) => {
              counts[item.category] = (counts[item.category] || 0) + 1;
              return counts;
            },
            {},
          )}
        />
      )}
      {!view && (
        <header className="secure-header">
          <div className="secure-brand">
            <ShieldCheck />
            <div>
              <strong>LegacyLock</strong>
              <small>数字遗产密库 · LVCF 3</small>
            </div>
          </div>
          <div className="secure-row">
            <span className="secure-badge">
              {view ? (owner ? "所有者 · 可管理" : "继承人 · 只读") : "已锁定"}
            </span>
            {view && (
              <button onClick={lock}>
                <LockKeyhole size={16} />
                立即锁定
              </button>
            )}
          </div>
        </header>
      )}
      <div
        className={view ? "restored-workspace" : "secure-shell"}
        style={view ? { zoom: preferences.zoom } : undefined}
      >
        {error && (
          <div className="secure-message error" role="alert">
            {error}
          </div>
        )}
        {status?.preferencesWarning && (
          <div className="secure-message" role="status">
            外观配置无法读取，暂用默认主题。密库不受影响；所有者解锁后可重新保存界面设置。
          </div>
        )}
        {notice && (
          <div className="secure-message" role="status">
            {notice}
          </div>
        )}
        {busy && <p role="status">正在验证或保存，请等待完成…</p>}
        {!status ? (
          <p>正在检查本机密库…</p>
        ) : !view ? (
          <div className="secure-grid">
            <section className="secure-card">
              <h1>
                {status.exists
                  ? importMode
                    ? "导入所有者备份"
                    : "解锁本机密库"
                  : importMode
                    ? "导入所有者备份"
                    : "创建本机密库"}
              </h1>
              {status.damaged && (
                <p className="secure-message error">
                  本机文件未通过校验。不会自动清空或覆盖，请保全文件并参考恢复文档。
                </p>
              )}
              <p>
                所有者解锁需要同时提供密码和安全密钥。继承人可通过双 U
                盘入口只读访问。
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    !status.exists &&
                    !importMode &&
                    (password.length < 12 || password !== repeat || !backed)
                  ) {
                    setError("密码须至少 12 位且两次一致；请先备份安全密钥。");
                    return;
                  }
                  void perform(
                    () =>
                      call(
                        status.exists && !importMode
                          ? "unlock"
                          : importMode
                            ? "importOwner"
                            : "initialize",
                        password,
                        secret,
                      ),
                    "密库已解锁。",
                  ).then((ok) => {
                    if (ok) clearCredentials();
                  });
                }}
              >
                <label>
                  {!status.exists && !importMode
                    ? "设置密码（至少 12 位）"
                    : "密码"}
                  <input
                    required
                    type="password"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {!status.exists && !importMode && (
                  <label>
                    再次输入密码
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      value={repeat}
                      onChange={(e) => setRepeat(e.target.value)}
                    />
                  </label>
                )}
                {!status.exists && !importMode ? (
                  <>
                    <label>
                      安全密钥（请抄录或保存）
                      <textarea readOnly rows={3} value={secret} />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void generate()}
                    >
                      生成随机安全密钥
                    </button>
                    <label className="secure-check">
                      <input
                        type="checkbox"
                        checked={backed}
                        onChange={(e) => setBacked(e.target.checked)}
                      />
                      已在独立安全位置备份此密钥
                    </label>
                  </>
                ) : (
                  secretInput(secret, setSecret)
                )}
                <button
                  className="primary"
                  disabled={
                    busy ||
                    status.damaged ||
                    (!status.exists && !importMode && !secret)
                  }
                >
                  {importMode
                    ? "选择备份并验证导入"
                    : status.exists
                      ? "解锁为所有者"
                      : "创建加密密库"}
                </button>
              </form>
              <button
                disabled={busy}
                onClick={() => {
                  clearCredentials();
                  setImportMode(!importMode);
                }}
              >
                {importMode ? "返回本机密库" : "从加密备份导入（需要两项凭据）"}
              </button>
              {!status.exists && (
                <details>
                  <summary>旧版数据迁移</summary>
                  <p>
                    仅迁移资产，保留原文件，不沿用旧版密钥和授权状态。旧副本的安全缺陷不会随迁移消失。
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => openAction("migrate-file")}
                  >
                    迁移旧版加密导出包
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => openAction("migrate-local")}
                  >
                    迁移此安装中的旧数据
                  </button>
                </details>
              )}
            </section>
            <section className="secure-card">
              <h2>继承人只读访问</h2>
              {usbControls}
              <p>
                两盘只解密数据，不授予修改、设置或导出管理权限。拔出任一盘会自动锁定。
              </p>
              <div className="secure-stack">
                <button
                  disabled={
                    busy ||
                    !ready ||
                    !status.exists ||
                    !status.recovery ||
                    status.damaged
                  }
                  onClick={() =>
                    void perform(
                      () => call("recover", primary, secondary, false),
                      "双盘验证完成，当前为只读会话。",
                    )
                  }
                >
                  用双盘打开本机密库
                </button>
                <button
                  disabled={busy || !ready || status.damaged}
                  onClick={() =>
                    void perform(
                      () => call("recover", primary, secondary, true),
                      "已导入签名密库，当前为只读会话。",
                    )
                  }
                >
                  选择备份导入并只读访问
                </button>
              </div>
              <p className="secure-hint">
                在另一台电脑上，选择任一盘 LegacyLock 目录中的
                vault.llvault。重启应用后仍需重新解锁。
              </p>
            </section>
          </div>
        ) : (
          <RightContentArea
            selectedNav={nav}
            items={view.items}
            currentTheme={currentTheme}
            busy={busy}
            canModify={owner}
            isReadOnly={preferences.subscriptionDemo === "expired"}
            demo={preferences.subscriptionDemo}
            onAddNew={add}
            onEditItem={(item) => {
              if (!busy) setEditor(item);
            }}
            onDeleteItem={(id) => {
              if (
                !busy &&
                owner &&
                window.confirm(
                  `删除“${view.items.find((i) => i.id === id)?.title || "此资产"}”？删除后请同步两盘备份。`,
                )
              ) {
                void perform(
                  () => call("deleteItem", id),
                  "资产已删除，请同步两盘备份。",
                );
              }
            }}
            onSelectTheme={(theme) =>
              void updatePreferences({ ...preferences, theme })
            }
            onOpenUsbPassword={() => openAction("credentials")}
            onOpenHealthCheck={() =>
              void perform(
                () => call("health"),
                "当前磁盘签名及会话完整性校验通过。此结果不代表离线 U 盘已更新。",
              )
            }
            onOpenSubscription={owner ? () => setSubscription(true) : undefined}
            onRequestTakeover={() => openAction("unlock")}
            onLock={lock}
            settingsContent={settingsPanel}
            backupContent={backupPanel}
            banner={
              <div className="workspace-status">
                <span className="secure-badge">
                  {owner ? "所有者 · 可管理" : "继承人 · 只读"}
                </span>
                <span>
                  资产 {view.items.length} · 版本 {view.revision} ·
                  本机保存后请同步两盘
                </span>
                {!owner && (
                  <>
                    <button onClick={() => openAction("unlock")}>
                      输入密码和密钥，接管管理权限
                    </button>
                    <p>
                      {view.settings.heirName} {view.settings.heirNotes}
                    </p>
                  </>
                )}
                {owner && preferences.subscriptionDemo === "expired" && (
                  <p>
                    订阅测试：模拟试用到期，资产只读。可在订阅测试中恢复试用，不会扣费。
                  </p>
                )}
              </div>
            }
          />
        )}
      </div>
      {owner && subscription && (
        <SubscriptionModal
          mode={preferences.subscriptionDemo}
          busy={busy}
          onClose={() => {
            if (!busy) setSubscription(false);
          }}
          onChange={(subscriptionDemo) =>
            updatePreferences({ ...preferences, subscriptionDemo })
          }
        />
      )}
      {owner && picker && (
        <CategoryPickerModal
          isOpen
          onClose={() => setPicker(false)}
          onSelectCategory={(c) => {
            setCategory(c);
            setEditor(null);
          }}
        />
      )}
      {view && editor !== undefined && (
        <ItemModal
          isOpen
          initialItem={editor}
          defaultCategory={category || "login"}
          isReadOnly={!owner || preferences.subscriptionDemo === "expired"}
          isHeirReadOnly={!owner}
          onUpgrade={owner ? () => {
            setEditor(undefined);
            setSubscription(true);
          } : undefined}
          onClose={() => {
            if (!busy) setEditor(undefined);
          }}
          onRequestTakeover={() =>
            owner ? setSubscription(true) : openAction("unlock")
          }
          onSave={async (item) => {
            if (
              !(await perform(
                () => call("saveItem", item),
                "资产已加密保存，请同步两盘备份。",
              ))
            )
              throw new Error(lastError.current || "保存未完成，请重试。");
          }}
          onDelete={async (id) => {
            if (
              !(await perform(
                () => call("deleteItem", id),
                "资产已删除，请同步两盘备份。",
              ))
            )
              throw new Error(lastError.current || "删除未完成。");
          }}
        />
      )}
      {action && (
        <dialog
          ref={credentialDialog}
          className="secure-overlay secure-controls"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) {
              setAction(null);
              clearCredentials();
            }
          }}
        >
          <section
            className="secure-card secure-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credential-title"
          >
            <h2 id="credential-title">
              {
                {
                  unlock: "验证所有者凭据",
                  export: "验证并导出备份",
                  provision: "验证并配置两盘",
                  credentials: "更换所有者凭据",
                  "migrate-file": "迁移旧版加密包",
                  "migrate-local": "迁移旧版本机数据",
                }[action]
              }
            </h2>
            <p>请同时填写密码和安全密钥。凭据不会写入浏览器存储。</p>
            {action === "provision" && (
              <p>
                此操作写入所选两盘的独立 LegacyLock
                目录，不格式化设备。成功后仍需妥善保管旧版备份。
              </p>
            )}
            {action.startsWith("migrate-") && (
              <p>
                以下先填写旧凭据，再设置全新的 LVCF 3
                凭据。旧版本机数据必须具有完整的两项认证信息。
              </p>
            )}
            {error && (
              <p className="secure-message error" role="alert">
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitAction();
              }}
            >
              <label>
                {action.startsWith("migrate-") ? "旧密码" : "当前密码"}
                <input
                  autoFocus
                  required
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {secretInput(
                secret,
                setSecret,
                action.startsWith("migrate-")
                  ? "旧安全密钥（旧包未设置密钥时可留空）"
                  : "当前安全密钥",
              )}
              {(action === "credentials" || action.startsWith("migrate-")) &&
                newFields}
              <div className="secure-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAction(null);
                    clearCredentials();
                  }}
                >
                  取消
                </button>
                <button className="primary" disabled={busy}>
                  验证并执行
                </button>
              </div>
            </form>
          </section>
        </dialog>
      )}
    </main>
  );
}
