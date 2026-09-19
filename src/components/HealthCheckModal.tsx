/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 密库 6 项密码学与完整性自检弹窗 (HealthCheckModal)
 * ============================================================================
 * 
 * 军规 6 项自检指标：
 * 1. LVCF 2.0 容器头魔数验证 (Header Verification)
 * 2. 所有者非对称数字签名验签 (Ed25519 Signature Verification)
 * 3. 对象数据 SHA-256 哈希与 AEAD 认证 (Object Hash Verification)
 * 4. 防回滚单调序列号验证 (Anti-Rollback Sequence Monotonicity)
 * 5. 主/副物理双钥匙槽位映射有效性 (Key Slot Verification)
 * 6. 30年离线救援自救单页存续性 (Offline Rescue Sheet Presence)
 */

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { VaultHealthReport } from '../types';
import { useI18n } from '../services/i18n';

/**
 * 密库健康自检弹窗属性接口
 */
interface HealthCheckModalProps {
  /** 弹窗是否可见 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 密库健康自检评估报告数据 */
  report: VaultHealthReport | null;
  /** 重新执行自检回调 */
  onRecheck: () => void;
  /** 是否正在执行自检计算中 */
  isChecking: boolean;
}

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose,
  report,
  onRecheck,
  isChecking,
}) => {
  const { t } = useI18n();

  if (!isOpen || !report) return null;

  const getStatusBadge = () => {
    switch (report.status) {
      case 'Healthy':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(52, 211, 153, 0.2)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {t('healthCheckModal.healthyBadge')}
          </span>
        );
      case 'Warning':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24', border: '1px solid rgba(251, 191, 36, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {t('healthCheckModal.warningBadge')}
          </span>
        );
      case 'Damaged':
      case 'RecoveryRequired':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(244, 63, 94, 0.2)', color: '#FDA4AF', border: '1px solid rgba(244, 63, 94, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            {t('healthCheckModal.dangerBadge')}
          </span>
        );
    }
  };

  const checks = [
    {
      name: 'LVCF 2.0 Header & Magic Verification',
      passed: report.headerVerified,
      desc: 'Magic bytes LEGACYLOCK and LVCF 2.0 metadata self-consistency verified',
    },
    {
      name: 'Owner Manifest Digital Signature',
      passed: report.signatureVerified,
      desc: 'Owner Ed25519 digital signature verified against tampering',
    },
    {
      name: 'Object Encrypted Hash Verification',
      passed: report.objectHashVerified,
      desc: 'Full SHA-256 payload checksum matches cipher payload against bit-rot',
    },
    {
      name: 'Anti-Rollback Monotonic Check',
      passed: report.antiRollbackVerified,
      desc: 'Version sequence monotonically advances to defeat replay attacks',
    },
    {
      name: 'Key Slot Mapping Validity',
      passed: report.keySlotVerified,
      desc: 'Master and heir public/private key slots mapped and active',
    },
    {
      name: '30-Year Offline Rescue Kit Presence',
      passed: report.offlineRescuePresent,
      desc: 'W3C standard standalone rescue tool present on drive for lifetime recovery',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-window-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部独立窗口标题栏 */}
        <div className="modal-window-header">
          <div className="modal-window-title">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 212, 255, 0.15)',
                border: '1px solid rgba(0, 212, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 212, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck style={{ width: 18, height: 18, color: '#00D4FF' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  {t('healthCheckModal.title')}
                </span>
                <span className="modal-badge-cat">
                  Audit
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                {t('healthCheckModal.subtitle')}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title={t('common.close')}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 报告内容 */}
        <div className="modal-window-body">
          {/* 得分与总体状态 */}
          <div className="form-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }}>
            <div>
              <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>Score</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                {report.score} <span style={{ fontSize: 14, color: '#7E92C4' }}>/ 100</span>
              </div>
            </div>

            <div>{getStatusBadge()}</div>
          </div>

          {/* 6 项巡检项目清单 */}
          <div className="form-card">
            <div className="form-card-title">
              <span>{t('healthCheckModal.title')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checks.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 9,
                    background: 'rgba(12, 16, 44, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: '#8EA4D4', lineHeight: 1.4 }}>{c.desc}</p>
                  </div>

                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    {c.passed ? (
                      <CheckCircle2 style={{ width: 16, height: 16, color: '#34D399' }} />
                    ) : (
                      <XCircle style={{ width: 16, height: 16, color: '#F43F5E' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 异常警告提示 */}
          {report.issues.length > 0 && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                fontSize: 12,
                color: '#FDE68A',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#FBBF24' }}>
                <AlertTriangle style={{ width: 16, height: 16 }} />
                <span>{t('healthCheckModal.issueFound')}</span>
              </div>
              <ul style={{ paddingLeft: 18, color: '#E2E8F0', lineHeight: 1.6 }}>
                {report.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 底部独立按钮栏 */}
        <div className="modal-window-footer">
          <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>
            {t('healthCheckModal.checkedAt')} {new Date(report.lastCheckedAt).toLocaleTimeString()}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onRecheck}
              disabled={isChecking}
              className="btn-action-cancel"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} className={isChecking ? 'animate-spin' : ''} />
              <span>{isChecking ? t('healthCheckModal.checkingBtn') : t('healthCheckModal.recheckBtn')}</span>
            </button>
            <button
              onClick={onClose}
              className="btn-action-submit"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
