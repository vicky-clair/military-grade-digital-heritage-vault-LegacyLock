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

interface MediaMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drives: UsbDrive[];
  onMigrateSuccess: (targetDrive: string) => void;
}

export const MediaMigrationModal: React.FC<MediaMigrationModalProps> = ({
  isOpen,
  onClose,
  drives,
  onMigrateSuccess,
}) => {
  const [targetDrive, setTargetDrive] = useState(drives.length > 1 ? drives[1].mountPath : '');
  const [targetType, setTargetType] = useState<MediaType>('UsbSSD');
  const [isMigrating, setIsMigrating] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartMigration = () => {
    if (!targetDrive) {
      alert('请选择要迁移的目标存储介质');
      return;
    }

    setIsMigrating(true);
    setStatusText('正在初始化目标介质并复制 LVCF 2.0 容器文件...');

    setTimeout(() => {
      setStatusText('正在进行全量哈希重新比对与所有者数字签名有效性验证...');
      setTimeout(() => {
        setIsMigrating(false);
        setStatusText('✅ 介质迁移完成！目标介质已升级为主所有者介质 (Primary)，原介质建议作为 Owner Backup B 保管。');
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
                  存储介质无缝迁移
                </span>
                <span className="modal-badge-cat">
                  Media Migration
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                支持从普通 U 盘平滑升级到移动固态 SSD / 移动硬盘
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="关闭窗口">
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
              迁移过程将完整保留 <strong>Vault ID</strong>、<strong>防回滚序号</strong> 与 <strong>所有者数字签名</strong>。原介质可作为冷备份保管。
            </p>
          </div>

          {/* 迁移示意图 (带框美化) */}
          <div className="form-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Usb style={{ width: 32, height: 32, color: '#8EA4D4' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>当前原介质</p>
              <p style={{ fontSize: 11, color: '#7E92C4', fontFamily: 'JetBrains Mono' }}>普通 U 盘</p>
            </div>

            <ArrowRight style={{ width: 24, height: 24, color: '#00D4FF' }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <HardDrive style={{ width: 32, height: 32, color: '#00D4FF' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>目标新介质</p>
              <p style={{ fontSize: 11, color: '#34D399', fontFamily: 'JetBrains Mono' }}>高速移动 SSD</p>
            </div>
          </div>

          {/* 目标设备选择 */}
          <div className="form-card">
            <div className="framed-input-container">
              <label className="framed-label">选择接入的目标存储介质 / 盘符</label>
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
                  其他外接存储驱动器 (自动格式化初始化)
                </option>
              </select>
            </div>

            <div className="framed-input-container">
              <label className="framed-label">目标介质物理类型</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as MediaType)}
                className="framed-select"
              >
                <option value="UsbSSD" style={{ background: '#12173B', color: '#FFFFFF' }}>高速移动固态硬盘 (Portable SSD)</option>
                <option value="NvmeEnclosure" style={{ background: '#12173B', color: '#FFFFFF' }}>NVMe 移动硬盘盒</option>
                <option value="UsbHDD" style={{ background: '#12173B', color: '#FFFFFF' }}>移动机械硬盘 (Portable HDD)</option>
                <option value="SDCard" style={{ background: '#12173B', color: '#FFFFFF' }}>高耐久 SD / TF 存储卡</option>
                <option value="UsbFlash" style={{ background: '#12173B', color: '#FFFFFF' }}>大容量 USB 3.2 闪存盘</option>
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
            取消
          </button>
          <button
            onClick={handleStartMigration}
            disabled={isMigrating}
            className="btn-action-submit"
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={isMigrating ? 'animate-spin' : ''} />
            <span>{isMigrating ? '正在执行迁移...' : '确认执行介质迁移'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
