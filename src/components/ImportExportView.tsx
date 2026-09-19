/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 军规加密备份导入与导出视图组件 (ImportExportView)
 * ============================================================================
 * 
 * 核心设计规范：
 * 1. 军规级加密密包标准：基于 AES-256-GCM + PBKDF2-100k 迭代导出受密码保护的 .legacylock 文件；
 * 2. 强制 UTF-8 编码传输：读取时显式声明 'UTF-8' 字符集，杜绝 Windows 中文 GBK 代码页导致的乱码；
 * 3. 智能数据合并：导入时支持选择「全量覆盖当前资产」或「增量合并（按 ID 去重补全）」；
 * 4. 离线文件持久化：支持直接下载至本地电脑，或通过 Electron 直接写入指定的外部 U 盘/移动硬盘根目录。
 */

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileCheck,
  AlertTriangle,
  HardDrive,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  ArrowDownUp,
  RefreshCw,
  Key,
  Usb,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
import { HeritagePlanConfig, UsbDrive, VaultItem } from '../types';
import {
  exportEncryptedVaultPackage,
  importEncryptedVaultPackage,
  isElectronApp,
  decryptWithDualUsb,
  verifyDriveHardwareBinding,
} from '../services/cryptoService';

/**
 * 导入导出视图属性接口
 */
interface ImportExportViewProps {
  /** 当前资产列表 */
  items: VaultItem[];
  /** 遗产继承计划配置 */
  plan: HeritagePlanConfig;
  /** 可选的外部物理驱动器列表 */
  drives: UsbDrive[];
  /** 导入成功后的回调 (传递新资产列表、是否全量覆盖、是否只读查看标记) */
  onImportSuccess: (newItems: VaultItem[], isOverwrite: boolean, isReadOnly?: boolean) => void;
  /** 重新扫描外部驱动器 */
  onRescanDrives?: () => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  items,
  plan,
  drives,
  onImportSuccess,
  onRescanDrives,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'dual_usb'>('export');

  // --- 导出状态 ---
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [exportTargetType, setExportTargetType] = useState<'drive' | 'custom'>('drive');
  const [selectedTargetDrive, setSelectedTargetDrive] = useState<string>(
    drives.length > 0 ? drives[0].mountPath : ''
  );
  const [customExportPath, setCustomExportPath] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // --- 导入状态 ---
  const [importFile, setImportFile] = useState<{ name: string; content: string; size: number } | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importSecretKey, setImportSecretKey] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // --- 双 U 盘解密导入状态 ---
  const masterDrive = drives.find((d) => d.hasUserKey);
  const heirDrive = drives.find((d) => d.hasHeirKey);
  const [dualUsbHeirPin, setDualUsbHeirPin] = useState('');
  const [showDualUsbPin, setShowDualUsbPin] = useState(false);
  const [isDualUsbImporting, setIsDualUsbImporting] = useState(false);
  const [dualUsbErrorMsg, setDualUsbErrorMsg] = useState<string | null>(null);
  const [dualUsbSuccessMsg, setDualUsbSuccessMsg] = useState<string | null>(null);

  // 执行双 U 盘解密导入 (继承人只读模式)
  const handleExecuteDualUsbImport = async () => {
    setDualUsbErrorMsg(null);
    setDualUsbSuccessMsg(null);

    if (!masterDrive || !heirDrive) {
      setDualUsbErrorMsg('必须同时插入【所有者主 U 盘 (含 user-key.bin)】与【继承人 U 盘 (含 heir-key.bin)】方可进行双盘联合解密。');
      return;
    }

    try {
      setIsDualUsbImporting(true);

      // 1. 物理硬件指纹防克隆绑定校验
      const bindRes = await verifyDriveHardwareBinding(heirDrive);
      if (!bindRes.matched) {
        setDualUsbErrorMsg(
          bindRes.error ||
            '❌ 继承人 U 盘硬件防克隆绑定校验未通过！检测到密钥文件被强制转移或克隆到未授权的 U 盘硬件。根据军规安全规范，禁止解密任何数据！'
        );
        setIsDualUsbImporting(false);
        return;
      }

      // 2. 执行双 U 盘联合密码学解密
      const res = await decryptWithDualUsb({
        masterDrive,
        heirDrive,
        currentItems: items,
      });

      if (!res.success || !res.items) {
        setDualUsbErrorMsg(res.error || '双 U 盘解密失败，请检查介质完整性与继承人口令。');
        return;
      }

      // 3. 导入数据并标记为只读模式 (isReadOnly: true)
      onImportSuccess(res.items, true, true);
      setDualUsbSuccessMsg(
        `🎉 军规双钥匙密码学协商成功！已安全解密并导入 ${res.items.length} 项核心资产。（系统已置为【继承人只读查看模式】，无法修改或销毁数据）`
      );
    } catch (err: any) {
      setDualUsbErrorMsg(err.message || '双 U 盘解密导入过程中发生异常');
    } finally {
      setIsDualUsbImporting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 一键生成 20 位高强度军规密码
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()_+';
    let pwd = '';
    const array = new Uint32Array(20);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 20; i++) {
      pwd += chars[array[i] % chars.length];
    }
    setExportPassword(pwd);
    setConfirmPassword(pwd);
    setShowExportPassword(true);
  };

  // 处理文件读取
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFile({
        name: file.name,
        content,
        size: file.size,
      });
      setImportErrorMsg(null);
      setImportSuccessMsg(null);
    };
    reader.onerror = () => {
      setImportErrorMsg('无法读取所选文件，请重试');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 执行加密导出
  const handleExecuteExport = async () => {
    setExportErrorMsg(null);
    setExportSuccessMsg(null);

    if (items.length === 0) {
      setExportErrorMsg('当前密库中暂无资产项，无法执行导出。');
      return;
    }

    if (!exportPassword || exportPassword.length < 6) {
      setExportErrorMsg('为了确保军规级防护，加密保护口令不得少于 6 位。');
      return;
    }

    if (exportPassword !== confirmPassword) {
      setExportErrorMsg('两次输入的保护口令不一致，请核对。');
      return;
    }

    try {
      setIsExporting(true);
      const secretKey = plan.usbPasswordConfig?.secretKey;
      const encryptedJson = await exportEncryptedVaultPackage(items, exportPassword, plan, secretKey);

      const targetDrive = exportTargetType === 'drive' ? selectedTargetDrive : undefined;
      const targetPath = exportTargetType === 'custom' ? customExportPath : undefined;

      // 如果是 Electron 且用户选择了特定外部移动盘或手动指定目录
      if (isElectronApp() && window.legacyLockAPI && (targetDrive || targetPath)) {
        try {
          await window.legacyLockAPI.saveVaultContainer({
            encryptedPackage: encryptedJson,
            targetDrive,
            targetPath,
          } as any);
          const destName = targetPath || targetDrive;
          setExportSuccessMsg(
            secretKey
              ? `✅ 军规加密密包已安全写入目标路径 ${destName} (受 密码+军规级紧急安全密钥 双重强化保护)`
              : `✅ 军规加密密包已安全写入目标路径 ${destName} (AES-256-GCM 保护)`
          );
        } catch (e: any) {
          // fallback to browser download
          triggerDownload(encryptedJson);
          setExportSuccessMsg(
            secretKey
              ? '✅ 军规加密备份包已生成并触发本地下载！(已融合军规级 Secret Key 双重加固)'
              : '✅ 军规加密备份包已生成并触发本地下载！'
          );
        }
      } else {
        // 浏览器下载
        triggerDownload(encryptedJson);
        setExportSuccessMsg(
          secretKey
            ? '✅ 军规加密备份包 (.legacylock) 已生成！(已绑定军规级安全密钥，恢复时需密码+密钥)'
            : '✅ 军规加密备份包 (.legacylock) 已生成并保存至本地！'
        );
      }
    } catch (err: any) {
      setExportErrorMsg(err.message || '导出过程中发生异常');
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (content: string) => {
    const blob = new Blob([new TextEncoder().encode(content)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LegacyLock_Vault_AES256_${new Date().toISOString().slice(0, 10)}.legacylock`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 执行解密导入
  const handleExecuteImport = async () => {
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    if (!importFile) {
      setImportErrorMsg('请先选择要导入的 .legacylock 或 .json 密库备份文件。');
      return;
    }

    try {
      setIsImporting(true);
      const result = await importEncryptedVaultPackage(
        importFile.content,
        importPassword,
        importSecretKey.trim()
      );

      onImportSuccess(result.items, mergeStrategy === 'overwrite');
      setImportSuccessMsg(
        `🎉 成功通过军规双重验证并导入 ${result.items.length} 项核心资产！（策略：${
          mergeStrategy === 'overwrite' ? '完全覆盖现有密库' : '安全增量合并'
        }）`
      );
      // 清空选择
      setImportFile(null);
      setImportPassword('');
      setImportSecretKey('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setImportErrorMsg(err.message || '解密导入失败');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1080, margin: '0 auto', width: '100%' }}>
      {/* 顶部标题区 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #00D4FF 0%, #0572EC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,212,255,0.3)',
            }}
          >
            <ArrowDownUp style={{ width: 20, height: 20, color: '#FFFFFF' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              军规级加密导入与导出中心
            </h2>
            <p style={{ fontSize: 12, color: '#7E92C4', margin: '3px 0 0 0' }}>
              基于 AES-256-GCM + PBKDF2 离线高强度加密，无任何中心化云端残留，支持双 U 盘防灾备份与跨设备安全迁移
            </p>
          </div>
        </div>

        {/* 模式切换 Tabs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: activeTab === 'export' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'export' ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'export' ? '#00D4FF' : '#94A3B8',
              transition: 'all 0.2s ease',
            }}
          >
            <Download style={{ width: 16, height: 16 }} />
            <span>军规加密导出</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(0,212,255,0.2)',
                color: '#38E1FF',
              }}
            >
              {items.length} 项
            </span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: activeTab === 'import' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'import' ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'import' ? '#00D4FF' : '#94A3B8',
              transition: 'all 0.2s ease',
            }}
          >
            <Upload style={{ width: 16, height: 16 }} />
            <span>解密验证导入</span>
          </button>

          <button
            onClick={() => setActiveTab('dual_usb')}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              border: activeTab === 'dual_usb' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'dual_usb' ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'dual_usb' ? '#00D4FF' : '#94A3B8',
              transition: 'all 0.2s ease',
            }}
          >
            <Usb style={{ width: 16, height: 16 }} />
            <span>双 U 盘解密导入 (只读查看)</span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: masterDrive && heirDrive ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                color: masterDrive && heirDrive ? '#34D399' : '#FBBF24',
              }}
            >
              {masterDrive && heirDrive ? '双盘就绪' : '检测介质'}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: 加密导出 */}
      {activeTab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          {/* 左侧：导出配置面板 */}
          <div className="form-card" style={{ padding: 22, background: 'rgba(15, 23, 42, 0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Lock style={{ width: 16, height: 16, color: '#00D4FF' }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                导出加密保护配置
              </h3>
            </div>

            {/* 提示条 */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(0, 212, 255, 0.07)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                fontSize: 12,
                color: '#BAE6FD',
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              🔒 导出密包受 AES-256-GCM 强加密保护。请妥善保管保护口令，导入恢复时必须输入该口令方能解密！
            </div>

            {/* 军规级 Secret Key 加固状态指示 */}
            {plan.usbPasswordConfig?.secretKey && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: 12,
                  color: '#6EE7B7',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  lineHeight: 1.5,
                }}
              >
                <Key style={{ width: 16, height: 16, color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>🛡️ 已激活军规级紧急安全密钥 (Secret Key) 加固：</strong>
                  <div style={{ fontSize: 11, color: '#A7F3D0', marginTop: 2 }}>
                    导出密包将基于 PBKDF2 混合口令与 128 位硬件安全密钥。下次重装导入时，必须同时提供【口令 + 安全密钥】，即使他人窃取了口令也绝对无法解密恢复！
                  </div>
                </div>
              </div>
            )}

            {/* 密码输入 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>
                  设置密包导出加密口令 <span style={{ color: '#F43F5E' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles style={{ width: 12, height: 12 }} />
                  <span>生成 20 位军规口令</span>
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showExportPassword ? 'text' : 'password'}
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="请输入至少 6 位高强度加密口令..."
                  className="framed-input"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowExportPassword(!showExportPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showExportPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* 确认密码 */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>
                确认保护口令 <span style={{ color: '#F43F5E' }}>*</span>
              </label>
              <input
                type={showExportPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入加密口令..."
                className="framed-input"
              />
            </div>

            {/* 导出目标位置配置 (对应用户标注：改成手动指定目录) */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>
                  导出目标保存位置 (可选)
                </label>
                {onRescanDrives && (
                  <button
                    type="button"
                    onClick={onRescanDrives}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00D4FF',
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw style={{ width: 11, height: 11 }} />
                    <span>刷新介质</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 选项 1：手动指定保存目录 (用户特别要求) */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: exportTargetType === 'custom' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.06)',
                    background: exportTargetType === 'custom' ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: exportTargetType === 'custom' ? 8 : 0 }}>
                    <input
                      type="radio"
                      name="exportTargetType"
                      checked={exportTargetType === 'custom'}
                      onChange={() => setExportTargetType('custom')}
                    />
                    <FolderOpen style={{ width: 14, height: 14, color: '#00D4FF' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>手动指定保存目录</span>
                    <span style={{ fontSize: 11, color: '#7E92C4' }}>（自定义本地硬盘或外接介质的存储文件夹）</span>
                  </label>

                  {exportTargetType === 'custom' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="text"
                        value={customExportPath}
                        onChange={(e) => setCustomExportPath(e.target.value)}
                        placeholder="点击右侧按钮选择保存目录，或手动粘贴路径..."
                        className="framed-input"
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      {isElectronApp() && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.legacyLockAPI?.selectOutputDirectory) {
                              const res = await window.legacyLockAPI.selectOutputDirectory();
                              if (!res.canceled && res.path) {
                                setCustomExportPath(res.path);
                              }
                            }
                          }}
                          style={{
                            padding: '0 12px',
                            background: 'rgba(0,212,255,0.15)',
                            border: '1px solid #00D4FF',
                            borderRadius: 6,
                            color: '#00D4FF',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <FolderOpen style={{ width: 13, height: 13 }} />
                          <span>浏览目录...</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 选项 2：检测到的物理介质 */}
                {drives.map((d) => (
                  <label
                    key={d.mountPath}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: exportTargetType === 'drive' && selectedTargetDrive === d.mountPath ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.06)',
                      background: exportTargetType === 'drive' && selectedTargetDrive === d.mountPath ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#E2E8F0',
                    }}
                  >
                    <input
                      type="radio"
                      name="exportTargetType"
                      checked={exportTargetType === 'drive' && selectedTargetDrive === d.mountPath}
                      onChange={() => {
                        setExportTargetType('drive');
                        setSelectedTargetDrive(d.mountPath);
                      }}
                    />
                    <HardDrive style={{ width: 14, height: 14, color: '#00D4FF' }} />
                    <span style={{ fontWeight: 600 }}>{d.mountPath}</span>
                    <span style={{ color: '#7E92C4' }}>({d.name || '移动存储介质'}{d.isRemovable ? ' · 可移动介质' : ''})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 错误或成功提示 */}
            {exportErrorMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{exportErrorMsg}</span>
              </div>
            )}

            {exportSuccessMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ADE80',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{exportSuccessMsg}</span>
              </div>
            )}

            {/* 导出按钮 */}
            <button
              onClick={handleExecuteExport}
              disabled={isExporting}
              className="btn-action-submit"
              style={{ width: '100%', height: 42, fontSize: 13, justifyContent: 'center' }}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} />
                  <span>正在执行军规级高强度加密封装...</span>
                </>
              ) : (
                <>
                  <Download style={{ width: 16, height: 16 }} />
                  <span>立即执行军规加密导出</span>
                </>
              )}
            </button>
          </div>

          {/* 右侧：密库摘要与安全参数 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-card" style={{ padding: 18, background: 'rgba(15, 23, 42, 0.7)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: '0 0 12px 0' }}>
                待导出的数字遗产摘要
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#7E92C4' }}>核心资产总数</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#00D4FF', marginTop: 2 }}>
                    {items.length} <span style={{ fontSize: 11, color: '#94A3B8' }}>项</span>
                  </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: '#7E92C4' }}>继承计划生效</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                    {plan.isConfigured ? '已激活' : '未开启'}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-card" style={{ padding: 18, background: 'rgba(15, 23, 42, 0.7)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                加密算法规范 (LVCF 2.0)
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#94A3B8', lineHeight: 1.8 }}>
                <li>主加密套件：<strong style={{ color: '#38E1FF' }}>AES-256-GCM</strong> (96 位随机 IV)</li>
                <li>密钥派生算法：<strong style={{ color: '#38E1FF' }}>PBKDF2-HMAC-SHA256</strong></li>
                <li>迭代强化轮次：<strong style={{ color: '#38E1FF' }}>100,000 次</strong> (抗 GPU 破解)</li>
                <li>防篡改校验：<strong style={{ color: '#38E1FF' }}>AEAD AuthTag + SHA-256</strong></li>
                <li>离线独立可用：W3C WebCrypto 国际工业级标准</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 解密导入 */}
      {activeTab === 'import' && (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="form-card" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileCheck style={{ width: 18, height: 18, color: '#00D4FF' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                选择密包并解密恢复
              </h3>
            </div>

            {/* 文件选择区 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(0, 212, 255, 0.3)',
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0, 212, 255, 0.02)',
                marginBottom: 18,
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".legacylock,.json,.lvcf"
                style={{ display: 'none' }}
              />
              <Upload style={{ width: 28, height: 28, color: '#00D4FF', margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                {importFile ? importFile.name : '点击选择或拖拽 .legacylock / .json 密包文件'}
              </div>
              <div style={{ fontSize: 11, color: '#7E92C4', marginTop: 4 }}>
                {importFile
                  ? `文件大小: ${(importFile.size / 1024).toFixed(1)} KB (已就绪)`
                  : '支持 LegacyLock 军规加密包、LVCF 2.0 容器及标准 JSON 备份'}
              </div>
            </div>

            {/* 解密口令输入 */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>
                输入密包解密口令 <span style={{ color: '#F43F5E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showImportPassword ? 'text' : 'password'}
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder="请输入导出时设置的加密口令..."
                  className="framed-input"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowImportPassword(!showImportPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showImportPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* 军规级安全密钥输入 (Secret Key) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>
                  <Key style={{ width: 14, height: 14, color: '#00D4FF' }} />
                  <span>军规级安全密钥 (Secret Key)</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>(若密包受密钥保护则必填)</span>
                </label>
              </div>
              <input
                type="text"
                value={importSecretKey}
                onChange={(e) => setImportSecretKey(e.target.value.toUpperCase())}
                placeholder="例如: LL-A1B2-C3D4-E5F6-G7H8-J9K0-L1M2 (34位)"
                className="framed-input"
                style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
              />
              <div style={{ fontSize: 11, color: '#7E92C4', marginTop: 4, lineHeight: 1.4 }}>
                💡 军规级防盗机制：若备份包启用了安全密钥加固，解密时必须同时输入口令与该密钥；单纯盗取密码者无法恢复任何数据。
              </div>
            </div>

            {/* 合并策略 */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>
                导入合并策略
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: 10,
                    borderRadius: 6,
                    border: mergeStrategy === 'merge' ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.08)',
                    background: mergeStrategy === 'merge' ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="mergeStrategy"
                    checked={mergeStrategy === 'merge'}
                    onChange={() => setMergeStrategy('merge')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>安全增量合并 (推荐)</div>
                    <div style={{ fontSize: 10, color: '#7E92C4', marginTop: 2 }}>保留当前已有资产，并追加密包中的新资产</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: 10,
                    borderRadius: 6,
                    border: mergeStrategy === 'overwrite' ? '1px solid #F43F5E' : '1px solid rgba(255,255,255,0.08)',
                    background: mergeStrategy === 'overwrite' ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="mergeStrategy"
                    checked={mergeStrategy === 'overwrite'}
                    onChange={() => setMergeStrategy('overwrite')}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#FDA4AF' }}>完全覆盖密库</div>
                    <div style={{ fontSize: 10, color: '#7E92C4', marginTop: 2 }}>清空当前所有内容，以导入密包完全替代</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 错误或成功提示 */}
            {importErrorMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{importErrorMsg}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ADE80',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* 导入按钮 */}
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="btn-action-submit"
              style={{ width: '100%', height: 42, fontSize: 13, justifyContent: 'center' }}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} />
                  <span>正在执行 PBKDF2 密钥派生与 AES-256 解密验签...</span>
                </>
              ) : (
                <>
                  <Upload style={{ width: 16, height: 16 }} />
                  <span>验证口令并解密导入</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: 双 U 盘解密导入 (只读查看) */}
      {activeTab === 'dual_usb' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="form-card" style={{ padding: 24, background: 'rgba(15, 23, 42, 0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Usb style={{ width: 18, height: 18, color: '#00D4FF' }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  双 U 盘联合解密导入 (继承人只读模式)
                </h3>
              </div>
              {onRescanDrives && (
                <button
                  type="button"
                  onClick={onRescanDrives}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00D4FF',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw style={{ width: 13, height: 13 }} />
                  <span>重新检测介质</span>
                </button>
              )}
            </div>

            {/* 核心提示 */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(0, 212, 255, 0.07)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                fontSize: 12,
                color: '#BAE6FD',
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              🛡️ <strong>军规双钥匙托管架构：</strong>必须同时接入【所有者主盘】与【继承人盘】方可激活密码学联合协商。导入后应用自动进入<strong>【严格只读模式】</strong>，继承人仅可查阅遗产数据，<strong>不可进行任何数据新增、编辑、删除或销毁操作</strong>，必须提供所有者密码与安全密钥才能取得修改权限。
            </div>

            {/* 双 U 盘硬件状态卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              {/* 主 U 盘 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: masterDrive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.3)',
                  background: masterDrive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <HardDrive style={{ width: 16, height: 16, color: masterDrive ? '#34D399' : '#F87171' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>所有者主 U 盘</span>
                </div>
                {masterDrive ? (
                  <div style={{ fontSize: 11, color: '#A7F3D0', lineHeight: 1.6 }}>
                    <div>盘符: <strong>{masterDrive.mountPath}</strong> ({masterDrive.name || '移动盘'})</div>
                    <div>主密钥: <span style={{ color: '#34D399' }}>✅ user-key.bin 已就绪</span></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#FDA4AF', lineHeight: 1.6 }}>
                    <div>未检测到含有 user-key.bin 的主 U 盘</div>
                    <div>请将所有者主介质插入电脑 USB 端口</div>
                  </div>
                )}
              </div>

              {/* 继承人 U 盘 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: heirDrive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.3)',
                  background: heirDrive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ShieldCheck style={{ width: 16, height: 16, color: heirDrive ? '#34D399' : '#F87171' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>继承人专属 U 盘</span>
                </div>
                {heirDrive ? (
                  <div style={{ fontSize: 11, color: '#A7F3D0', lineHeight: 1.6 }}>
                    <div>盘符: <strong>{heirDrive.mountPath}</strong> ({heirDrive.name || '移动盘'})</div>
                    <div>继承密钥: <span style={{ color: '#34D399' }}>✅ heir-key.bin 已就绪</span></div>
                    <div>硬件防克隆: <span style={{ color: '#38BDF8' }}>🔒 介质硬件指纹绑定保护</span></div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#FDA4AF', lineHeight: 1.6 }}>
                    <div>未检测到含有 heir-key.bin 的继承人 U 盘</div>
                    <div>请将法定继承人专属 U 盘插入电脑 USB 端口</div>
                  </div>
                )}
              </div>
            </div>

            {/* 继承人接管口令 (若配置) */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>
                法定继承人接管口令 (Heir PIN，若未设置口令请留空)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showDualUsbPin ? 'text' : 'password'}
                  value={dualUsbHeirPin}
                  onChange={(e) => setDualUsbHeirPin(e.target.value)}
                  placeholder="若设置了继承人口令请输入..."
                  className="framed-input"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowDualUsbPin(!showDualUsbPin)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showDualUsbPin ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* 错误或成功提示 */}
            {dualUsbErrorMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{dualUsbErrorMsg}</span>
              </div>
            )}

            {dualUsbSuccessMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ADE80',
                  fontSize: 12,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Check style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span>{dualUsbSuccessMsg}</span>
              </div>
            )}

            {/* 解密按钮 */}
            <button
              onClick={handleExecuteDualUsbImport}
              disabled={isDualUsbImporting || !masterDrive || !heirDrive}
              className="btn-action-submit"
              style={{
                width: '100%',
                height: 44,
                fontSize: 13,
                justifyContent: 'center',
                opacity: !masterDrive || !heirDrive ? 0.6 : 1,
              }}
            >
              {isDualUsbImporting ? (
                <>
                  <RefreshCw className="animate-spin" style={{ width: 16, height: 16 }} />
                  <span>正在执行硬件指纹验签与双钥匙联合密码协商...</span>
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: 16, height: 16 }} />
                  <span>验证双 U 盘并导入数据 (进入只读查看)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
