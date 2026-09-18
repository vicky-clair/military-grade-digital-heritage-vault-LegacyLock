import React, { useState } from 'react';
import {
  Info,
  Shield,
  AlertTriangle,
  Clock,
  HardDrive,
  Lock,
  Key,
  FileText,
  Fingerprint,
  Globe,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Database,
} from 'lucide-react';

interface SettingsViewProps {
  totalItems: number;
  drivesCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  totalItems,
  drivesCount,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('about');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const buildDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="settings-view-container">
      {/* ====== 应用信息卡片 ====== */}
      <div className="settings-card" onClick={() => toggleSection('about')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper about">
            <Info style={{ width: 18, height: 18, color: '#60A5FA' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">应用信息</h3>
            <p className="settings-card-desc">软件版本、技术规格与许可声明</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'about' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'about' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-info-grid">
              <div className="settings-info-item">
                <span className="settings-info-label">应用名称</span>
                <span className="settings-info-value">LegacyLock 军规遗产密钥库</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">软件版本</span>
                <span className="settings-info-value mono">v1.0.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">容器格式</span>
                <span className="settings-info-value mono">LVCF 2.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">加密套件</span>
                <span className="settings-info-value mono">LLCS-1 (AES-256-GCM)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">密钥派生</span>
                <span className="settings-info-value mono">PBKDF2 × 100,000 轮</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">构建日期</span>
                <span className="settings-info-value mono">{buildDate}</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">技术栈</span>
                <span className="settings-info-value mono">React + Vite + TypeScript</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">设计规范</span>
                <span className="settings-info-value">Military-Grade Digital Heritage Vault</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 重要安全提醒 ====== */}
      <div className="settings-card" onClick={() => toggleSection('warnings')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper warning">
            <AlertTriangle style={{ width: 18, height: 18, color: '#FBBF24' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">重要安全提醒</h3>
            <p className="settings-card-desc">关于 U 盘、数据安全与灾难恢复的关键警告</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'warnings' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'warnings' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-warning-list">
              <div className="settings-warning-item critical">
                <div className="warning-icon-badge critical">
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                </div>
                <div>
                  <strong>U 盘丢失 = 数据永久不可恢复</strong>
                  <p>LegacyLock 采用端到端离线加密架构，所有密钥与资产数据仅存储于您的 U 盘中。若 U 盘丢失、损坏或被格式化，将导致全部数据永久灭失，任何人（包括开发者）均无法恢复。</p>
                </div>
              </div>

              <div className="settings-warning-item critical">
                <div className="warning-icon-badge critical">
                  <Key style={{ width: 14, height: 14 }} />
                </div>
                <div>
                  <strong>忘记 U 盘密码 = 无法解锁</strong>
                  <p>U 盘保护密码（PIN 码）由用户独立设定，无任何后门或重置机制。请务必牢记密码或使用安全的物理记录方式备份。</p>
                </div>
              </div>

              <div className="settings-warning-item warning">
                <div className="warning-icon-badge warning">
                  <HardDrive style={{ width: 14, height: 14 }} />
                </div>
                <div>
                  <strong>建议使用双 U 盘异地备份</strong>
                  <p>强烈建议您准备两个 U 盘——主盘日常使用、副盘定期同步后存放于银行保险柜或安全异地点。这是军规级「双保险箱」防灾策略的核心。</p>
                </div>
              </div>

              <div className="settings-warning-item warning">
                <div className="warning-icon-badge warning">
                  <Shield style={{ width: 14, height: 14 }} />
                </div>
                <div>
                  <strong>继承人恢复模式为只读</strong>
                  <p>继承人使用副盘激活恢复模式后，仅拥有只读权限。该模式无法添加、编辑或删除任何资产，仅用于紧急取回密钥信息。</p>
                </div>
              </div>

              <div className="settings-warning-item info">
                <div className="warning-icon-badge info">
                  <Clock style={{ width: 14, height: 14 }} />
                </div>
                <div>
                  <strong>定期执行健康检查</strong>
                  <p>建议每月至少运行一次「保险库健康检查」，验证 U 盘的密钥完整性、容器签名与防回滚保护，确保数据始终处于可恢复状态。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 数据统计概览 ====== */}
      <div className="settings-card" onClick={() => toggleSection('stats')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper stats">
            <Database style={{ width: 18, height: 18, color: '#34D399' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">数据统计</h3>
            <p className="settings-card-desc">当前保险库的资产与设备概况</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'stats' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'stats' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-stats-grid">
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <FileText style={{ width: 20, height: 20, color: '#A78BFA' }} />
                </div>
                <div className="stat-number">{totalItems}</div>
                <div className="stat-label">已收录资产</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <HardDrive style={{ width: 20, height: 20, color: '#34D399' }} />
                </div>
                <div className="stat-number">{drivesCount}</div>
                <div className="stat-label">已连接介质</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <Lock style={{ width: 20, height: 20, color: '#FBBF24' }} />
                </div>
                <div className="stat-number">AES-256</div>
                <div className="stat-label">加密强度</div>
              </div>
              <div className="settings-stat-card">
                <div className="stat-icon-wrapper">
                  <Fingerprint style={{ width: 20, height: 20, color: '#F472B6' }} />
                </div>
                <div className="stat-number">LLCS-1</div>
                <div className="stat-label">密码套件</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 安全技术规格 ====== */}
      <div className="settings-card" onClick={() => toggleSection('tech')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper tech">
            <Cpu style={{ width: 18, height: 18, color: '#C084FC' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">安全技术规格</h3>
            <p className="settings-card-desc">加密引擎参数与存储架构详情</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'tech' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'tech' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-tech-list">
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>对称加密：AES-256-GCM 认证加密（WebCrypto API 原生实现）</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>密钥派生：PBKDF2 (SHA-256)，迭代 100,000 次，16 字节随机盐</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>容器格式：LVCF 2.0（LegacyLock Vault Container Format）</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>存储架构：纯离线本地/U 盘存储，零云端依赖，零后门</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>双盘策略：所有者主盘 + 继承人副盘，异地物理隔离</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>防回滚保护：序列号 + 代数双重递增校验机制</span>
              </div>
              <div className="settings-tech-row">
                <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
                <span>完整性验证：SHA-256 清单哈希 + 所有者数字签名</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 免责声明 ====== */}
      <div className="settings-card" onClick={() => toggleSection('disclaimer')}>
        <div className="settings-card-header">
          <div className="settings-card-icon-wrapper disclaimer">
            <Globe style={{ width: 18, height: 18, color: '#94A3B8' }} />
          </div>
          <div className="settings-card-title-area">
            <h3 className="settings-card-title">免责声明与法律信息</h3>
            <p className="settings-card-desc">使用须知、许可与责任条款</p>
          </div>
          <ChevronRight
            className={`settings-chevron ${expandedSection === 'disclaimer' ? 'open' : ''}`}
            style={{ width: 18, height: 18 }}
          />
        </div>
        {expandedSection === 'disclaimer' && (
          <div className="settings-card-body" onClick={(e) => e.stopPropagation()}>
            <div className="settings-disclaimer-text">
              <p>
                LegacyLock 军规遗产密钥库是一款端到端离线加密工具，旨在为用户提供个人数字资产的安全保管服务。
                本软件采用纯离线架构，不连接任何云端服务，不收集、不传输、不存储任何用户数据。
              </p>
              <p>
                <strong>用户须知：</strong>用户对自身数据的安全保管负有完全责任。因 U 盘丢失、损坏、密码遗忘或未执行备份
                而导致的数据灭失，开发者不承担任何直接或间接责任。
              </p>
              <p>
                <strong>最佳实践建议：</strong>
              </p>
              <ul>
                <li>定期使用「加密导入导出」功能备份保险库至安全存储</li>
                <li>始终维护至少两个 U 盘（主盘 + 异地副盘）</li>
                <li>每月执行一次健康检查以确认数据完整性</li>
                <li>妥善保管 U 盘 PIN 码及继承人恢复密码</li>
                <li>请勿在不安全的公共计算机上使用本应用</li>
              </ul>
              <p className="copyright">
                © 2026 LegacyLock. Military-Grade Digital Heritage Vault. All rights reserved.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
