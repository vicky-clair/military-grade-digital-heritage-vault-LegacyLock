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

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: VaultHealthReport | null;
  onRecheck: () => void;
  isChecking: boolean;
}

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  onClose,
  report,
  onRecheck,
  isChecking,
}) => {
  if (!isOpen || !report) return null;

  const getStatusBadge = () => {
    switch (report.status) {
      case 'Healthy':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(52, 211, 153, 0.2)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            HEALTHY · 军规级健康
          </span>
        );
      case 'Warning':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(251, 191, 36, 0.2)', color: '#FBBF24', border: '1px solid rgba(251, 191, 36, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            WARNING · 存在潜在风险
          </span>
        );
      case 'Damaged':
      case 'RecoveryRequired':
        return (
          <span style={{ padding: '3px 10px', borderRadius: 9999, background: 'rgba(244, 63, 94, 0.2)', color: '#FDA4AF', border: '1px solid rgba(244, 63, 94, 0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
            DAMAGED · 完整性受损
          </span>
        );
    }
  };

  const checks = [
    {
      name: 'LVCF 2.0 容器头与魔数校验 (Header Verification)',
      passed: report.headerVerified,
      desc: '魔数 LEGACYLOCK、容器标准版本 2.0 及核心元数据自描述完整',
    },
    {
      name: '所有者数字签名防篡改验证 (Manifest Signature)',
      passed: report.signatureVerified,
      desc: '使用所有者签名私钥验签，确保文件未被十六进制或第三方非法篡改',
    },
    {
      name: '资产对象加密哈希完整性 (Object Hash Verification)',
      passed: report.objectHashVerified,
      desc: '全量数字资产密文 SHA-256 校验和完全匹配，杜绝静默位翻转',
    },
    {
      name: '单调递增防回滚检查 (Anti-Rollback Sequence)',
      passed: report.antiRollbackVerified,
      desc: '版本序号与代际 Monotonic 严格递增，防止攻击者覆盖旧保险库',
    },
    {
      name: '双介质密钥槽有效性 (Key Slot Verification)',
      passed: report.keySlotVerified,
      desc: '主介质与继承介质公私钥槽位映射合法且处于有效期内',
    },
    {
      name: '30年长效离线自救应急包 (Company Disappearance Test)',
      passed: report.offlineRescuePresent,
      desc: '介质内包含 W3C 标准 WebCrypto 离线单页，即使开发商倒闭亦能自主解密',
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
                  存储介质健康与密码学自检
                </span>
                <span className="modal-badge-cat">
                  Health Check
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                根据 LegacyLock v2 规范执行 6 项物理与密码学完整性巡检
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="关闭窗口">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 报告内容 */}
        <div className="modal-window-body">
          {/* 得分与总体状态 */}
          <div className="form-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }}>
            <div>
              <span style={{ fontSize: 11, color: '#8EA4D4', fontFamily: 'JetBrains Mono' }}>综合健康指数</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                {report.score} <span style={{ fontSize: 14, color: '#7E92C4' }}>/ 100</span>
              </div>
            </div>

            <div>{getStatusBadge()}</div>
          </div>

          {/* 6 项巡检项目清单 */}
          <div className="form-card">
            <div className="form-card-title">
              <span>巡检项目清单 (6 项军规检测)</span>
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
                <span>发现潜在注意项：</span>
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
            上次巡检: {new Date(report.lastCheckedAt).toLocaleTimeString()}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onRecheck}
              disabled={isChecking}
              className="btn-action-cancel"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} className={isChecking ? 'animate-spin' : ''} />
              <span>重新自检</span>
            </button>
            <button
              onClick={onClose}
              className="btn-action-submit"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
