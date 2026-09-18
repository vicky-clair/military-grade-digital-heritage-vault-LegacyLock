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
} from 'lucide-react';
import { HeritagePlanConfig, UsbDrive, VaultItem } from '../types';
import {
  exportEncryptedVaultPackage,
  importEncryptedVaultPackage,
  isElectronApp,
} from '../services/cryptoService';

interface ImportExportViewProps {
  items: VaultItem[];
  plan: HeritagePlanConfig;
  drives: UsbDrive[];
  onImportSuccess: (newItems: VaultItem[], isOverwrite: boolean) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  items,
  plan,
  drives,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // --- 导出状态 ---
  const [exportPassword, setExportPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [selectedTargetDrive, setSelectedTargetDrive] = useState<string>(
    drives.length > 0 ? drives[0].mountPath : ''
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportErrorMsg, setExportErrorMsg] = useState<string | null>(null);

  // --- 导入状态 ---
  const [importFile, setImportFile] = useState<{ name: string; content: string; size: number } | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

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
      const encryptedJson = await exportEncryptedVaultPackage(items, exportPassword, plan);

      // 如果是 Electron 且用户选择了特定外部移动盘
      if (isElectronApp() && window.legacyLockAPI && selectedTargetDrive) {
        try {
          await window.legacyLockAPI.saveVaultContainer({
            encryptedPackage: encryptedJson,
            targetDrive: selectedTargetDrive,
          } as any);
          setExportSuccessMsg(
            `✅ 军规加密密包已安全写入外接盘 ${selectedTargetDrive} (AES-256-GCM 保护)`
          );
        } catch (e: any) {
          // fallback to browser download
          triggerDownload(encryptedJson);
          setExportSuccessMsg('✅ 军规加密备份包已生成并触发本地下载！');
        }
      } else {
        // 浏览器下载
        triggerDownload(encryptedJson);
        setExportSuccessMsg('✅ 军规加密备份包 (.legacylock) 已生成并保存至本地！');
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
      const result = await importEncryptedVaultPackage(importFile.content, importPassword);

      onImportSuccess(result.items, mergeStrategy === 'overwrite');
      setImportSuccessMsg(
        `🎉 成功解密并导入 ${result.items.length} 项核心资产！（策略：${
          mergeStrategy === 'overwrite' ? '完全覆盖现有密库' : '安全增量合并'
        }）`
      );
      // 清空选择
      setImportFile(null);
      setImportPassword('');
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
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              🔒 导出密包受 AES-256-GCM 密码强加密保护。请妥善保管该口令，导入恢复时必须输入该口令方能解密！
            </div>

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

            {/* 目标驱动器选择 (若有外接介质) */}
            {drives.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#E2E8F0', marginBottom: 6 }}>
                  直接写入外部移动介质 (可选)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drives.map((d) => (
                    <label
                      key={d.mountPath}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: selectedTargetDrive === d.mountPath ? '1px solid #00D4FF' : '1px solid rgba(255,255,255,0.06)',
                        background: selectedTargetDrive === d.mountPath ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#E2E8F0',
                      }}
                    >
                      <input
                        type="radio"
                        name="targetDrive"
                        checked={selectedTargetDrive === d.mountPath}
                        onChange={() => setSelectedTargetDrive(d.mountPath)}
                      />
                      <HardDrive style={{ width: 14, height: 14, color: '#00D4FF' }} />
                      <span style={{ fontWeight: 600 }}>{d.mountPath}</span>
                      <span style={{ color: '#7E92C4' }}>({d.name || '移动存储介质'}{d.isRemovable ? ' · 可移动介质' : ''})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
    </div>
  );
};
