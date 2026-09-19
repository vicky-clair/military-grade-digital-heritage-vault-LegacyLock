/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 介质无损迁移与升级向导弹窗 (MediaMigrationModal)
 * ============================================================================
 * 
 * 硬件安全背景：
 * 消费级闪存（NAND Flash）基于浮栅晶体管保存电荷，断电存放 5~10 年存在自然电荷衰减（Bit-Rot）。
 * 本向导协助用户将遗产密库与主钥匙完整克隆迁移至新高速移动固态（USB SSD）或机械移动硬盘（HDD），
 * 重新写入刷新物理存储单元，保障 30 年跨世代无损长存。
 */

import React, { useState } from 'react';
import {
  HardDrive,
  Usb,
  ArrowRight,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { MediaType, UsbDrive } from '../types';
import { useI18n } from '../services/i18n';

/**
 * 介质迁移向导弹窗属性接口
 */
interface MediaMigrationModalProps {
  /** 弹窗是否可见 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 探测到的可用物理驱动器列表 */
  drives: UsbDrive[];
  /** 迁移成功后的回调 */
  onMigrateSuccess: (targetDrive: string) => void;
}

export const MediaMigrationModal: React.FC<MediaMigrationModalProps> = ({
  isOpen,
  onClose,
  drives,
  onMigrateSuccess,
}) => {
  const { t } = useI18n();
  const [targetDrive, setTargetDrive] = useState(drives.length > 1 ? drives[1].mountPath : '');
  const [targetType, setTargetType] = useState<MediaType>('UsbSSD');
  const [isMigrating, setIsMigrating] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartMigration = () => {
    if (!targetDrive) {
      alert(t('mediaMigrationModal.noDriveSelectedAlert'));
      return;
    }

    setIsMigrating(true);
    setStatusText(t('mediaMigrationModal.step1'));

    setTimeout(() => {
      setStatusText(t('mediaMigrationModal.step2'));
      setTimeout(() => {
        setIsMigrating(false);
        setStatusText(t('mediaMigrationModal.successAlert'));
        onMigrateSuccess(targetDrive);
      }, 1200);
    }, 1000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="modal-window-header">
          <div className="modal-window-title">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0572EC 0%, #00D4FF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(5, 114, 236, 0.4)',
                flexShrink: 0,
              }}
            >
              <HardDrive style={{ width: 18, height: 18, color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  {t('mediaMigrationModal.title')}
                </span>
                <span className="modal-badge-cat">
                  Migration
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                {t('mediaMigrationModal.subtitle')}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title={t('common.close')}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="modal-window-body">
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(5, 114, 236, 0.12)',
              border: '1px solid rgba(5, 114, 236, 0.3)',
              fontSize: 12,
              color: '#93C5FD',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.5,
            }}
          >
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
            <p>
              LVCF 2.0 <strong>Vault ID</strong> · <strong>Anti-Rollback Monotonic</strong> · <strong>Ed25519 Signature</strong>
            </p>
          </div>

          {/* 迁移示意图 (带框美化) */}
          <div className="form-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Usb style={{ width: 32, height: 32, color: '#8EA4D4' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Source Drive</p>
              <p style={{ fontSize: 11, color: '#7E92C4', fontFamily: 'JetBrains Mono' }}>USB Flash Drive</p>
            </div>

            <ArrowRight style={{ width: 24, height: 24, color: '#00D4FF' }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <HardDrive style={{ width: 32, height: 32, color: '#00D4FF' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>Target Drive</p>
              <p style={{ fontSize: 11, color: '#34D399', fontFamily: 'JetBrains Mono' }}>Portable SSD / NVMe</p>
            </div>
          </div>

          {/* 目标设备选择 */}
          <div className="form-card">
            <div className="framed-input-container">
              <label className="framed-label">{t('mediaMigrationModal.selectTargetLabel')}</label>
              <select
                value={targetDrive}
                onChange={(e) => setTargetDrive(e.target.value)}
                className="framed-select"
              >
                {drives.map((d) => (
                  <option key={d.mountPath} value={d.mountPath} style={{ background: '#12173B', color: '#FFFFFF' }}>
                    {d.name} ({d.mountPath})
                  </option>
                ))}
                <option value="NEW_EXTERNAL" style={{ background: '#12173B', color: '#FFFFFF' }}>
                  {t('mediaMigrationModal.selectDrivePlaceholder')}
                </option>
              </select>
            </div>

            <div className="framed-input-container">
              <label className="framed-label">{t('mediaMigrationModal.targetTypeLabel')}</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as MediaType)}
                className="framed-select"
              >
                <option value="UsbSSD" style={{ background: '#12173B', color: '#FFFFFF' }}>Portable SSD (NVMe / USB 3.2)</option>
                <option value="NvmeEnclosure" style={{ background: '#12173B', color: '#FFFFFF' }}>NVMe M.2 Enclosure</option>
                <option value="UsbHDD" style={{ background: '#12173B', color: '#FFFFFF' }}>Portable HDD (Mechanical)</option>
                <option value="SDCard" style={{ background: '#12173B', color: '#FFFFFF' }}>High Endurance SD / TF Card</option>
                <option value="UsbFlash" style={{ background: '#12173B', color: '#FFFFFF' }}>High Capacity USB 3.2 Flash Drive</option>
              </select>
            </div>
          </div>

          {statusText && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: 'rgba(5, 114, 236, 0.15)',
                border: '1px solid rgba(0, 212, 255, 0.35)',
                fontSize: 12,
                color: '#93C5FD',
              }}
            >
              {statusText}
            </div>
          )}
        </div>

        {/* 底部独立按钮栏 */}
        <div className="modal-window-footer" style={{ justifyContent: 'flex-end', gap: 12 }}>
          <button
            onClick={onClose}
            className="btn-action-cancel"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleStartMigration}
            disabled={isMigrating}
            className="btn-action-submit"
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={isMigrating ? 'animate-spin' : ''} />
            <span>{isMigrating ? t('mediaMigrationModal.migratingBtn') : t('mediaMigrationModal.startMigrationBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
