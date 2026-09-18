import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Compass,
} from 'lucide-react';
import { VaultCategory, VaultField, VaultItem } from '../types';
import { CATEGORIES, getCategoryDef } from '../services/categories';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
  initialItem?: VaultItem | null;
  defaultCategory?: VaultCategory;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  defaultCategory = 'login',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>(defaultCategory);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [inheritanceInstructions, setInheritanceInstructions] = useState('');
  const [customFields, setCustomFields] = useState<VaultField[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genLength, setGenLength] = useState(20);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setCategory(initialItem.category);
      setUsername(initialItem.username || '');
      setPassword(initialItem.password || '');
      setUrl(initialItem.url || '');
      setNotes(initialItem.notes || '');
      setInheritanceInstructions(initialItem.inheritanceInstructions || '');
      setCustomFields(initialItem.customFields || []);
    } else {
      const cat = defaultCategory || 'login';
      const def = getCategoryDef(cat);
      setCategory(cat);
      setTitle('');
      setUsername('');
      setPassword('');
      setUrl('');
      setNotes('');
      setInheritanceInstructions('');

      if (def.defaultFields && def.defaultFields.length > 0) {
        setCustomFields(
          def.defaultFields.map((f, idx) => ({
            id: `field-preset-${idx}-${Date.now()}`,
            name: f.name,
            value: f.defaultValue || '',
            isSecret: f.isSecret,
          }))
        );
      } else {
        setCustomFields([]);
      }
    }
  }, [initialItem, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const currentCategoryDef = getCategoryDef(category);
  const CategoryIcon = currentCategoryDef.icon;

  const generatePassword = (length = genLength, symbols = includeSymbols) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pool = letters + numbers;
    if (symbols) pool += syms;

    let result = '';
    for (let i = 0; i < length; i++) {
      result += pool.charAt(Math.floor(Math.random() * pool.length));
    }
    setPassword(result);
  };

  const handleAddField = () => {
    setCustomFields([
      ...customFields,
      {
        id: `field-${Date.now()}`,
        name: '',
        value: '',
        isSecret: false,
      },
    ]);
  };

  const handleRemoveField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  const handleFieldChange = (id: string, key: 'name' | 'value' | 'isSecret', val: any) => {
    setCustomFields(
      customFields.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const item: VaultItem = {
      id: initialItem?.id || `item-${Date.now()}`,
      title,
      category,
      username: username || undefined,
      password: password || undefined,
      url: url || undefined,
      notes: notes || undefined,
      inheritanceInstructions: inheritanceInstructions || undefined,
      customFields: customFields.filter((f) => f.name.trim() !== ''),
      createdAt: initialItem?.createdAt || Date.now(),
      updatedAt: Date.now(),
      revision: (initialItem?.revision || 0) + 1,
    };

    onSave(item);
    onClose();
  };

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
                background: currentCategoryDef.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                flexShrink: 0,
              }}
            >
              <CategoryIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  {initialItem ? '编辑资产项目' : `新建 · ${currentCategoryDef.name}`}
                </span>
                <span className="modal-badge-cat">
                  {currentCategoryDef.englishName}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#8EA4D4', marginTop: 2 }}>
                {currentCategoryDef.description}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="modal-window-close" title="关闭窗口">
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 独立窗口表单正文 */}
        <form onSubmit={handleSubmit} className="modal-window-body">
          {/* 卡片 1: 基本标识 (项目标题与所属分类) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>基本信息 (Basic Info)</span>
              <span style={{ fontSize: 10, color: '#00D4FF', textTransform: 'none' }}>* 必填项</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div className="framed-input-container">
                <label className="framed-label">项目标题 *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`例如: ${currentCategoryDef.name}名称 / 标识`}
                  className="framed-input"
                />
              </div>

              <div className="framed-input-container">
                <label className="framed-label">所属分类</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VaultCategory)}
                    className="framed-select"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: '#12173B', color: '#FFFFFF' }}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      color: '#8EA4D4',
                      position: 'absolute',
                      right: 12,
                      top: 13,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 卡片 2: 核心凭证 (Credentials) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>核心凭证 (Credentials)</span>
            </div>

            {/* 用户名 / 账号 */}
            <div className="framed-input-container">
              <label className="framed-label">用户名 / 主识别账号</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名、邮箱、卡号或主要账户标识"
                className="framed-input"
              />
            </div>

            {/* 密码 / 核心加密口令 */}
            <div className="framed-input-container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="framed-label">密码 / 核心加密口令</label>
                <button
                  type="button"
                  onClick={() => setShowGenerator(!showGenerator)}
                  className="btn-framed-cyan"
                >
                  <Sparkles style={{ width: 12, height: 12 }} />
                  <span>生成高强度密码</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入或生成高安全密钥口令"
                  className="framed-input font-mono"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-framed-icon"
                  title={showPassword ? '隐藏明文' : '显示明文'}
                >
                  {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>

              {/* 展开的密码生成器 (带框美化) */}
              {showGenerator && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 14,
                    borderRadius: 10,
                    background: 'rgba(12, 16, 46, 0.95)',
                    border: '1px solid rgba(0, 212, 255, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: '#D3E0FA', fontWeight: 600 }}>密码长度: {genLength} 位</span>
                    <button
                      type="button"
                      onClick={() => generatePassword()}
                      className="btn-framed-cyan"
                    >
                      <RefreshCw style={{ width: 12, height: 12 }} />
                      <span>重新生成</span>
                    </button>
                  </div>

                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={genLength}
                    onChange={(e) => {
                      const len = parseInt(e.target.value);
                      setGenLength(len);
                      generatePassword(len);
                    }}
                    style={{ accentColor: '#00D4FF', width: '100%', cursor: 'pointer' }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A4B8E4' }}>
                    <input
                      type="checkbox"
                      id="gen-symbols"
                      checked={includeSymbols}
                      onChange={(e) => {
                        setIncludeSymbols(e.target.checked);
                        generatePassword(genLength, e.target.checked);
                      }}
                      style={{ accentColor: '#0572EC', cursor: 'pointer' }}
                    />
                    <label htmlFor="gen-symbols" style={{ cursor: 'pointer' }}>
                      包含特殊符号 (!@#$%^&*)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 关联网址 */}
            <div className="framed-input-container">
              <label className="framed-label">关联网址 / 节点服务器地址 (可选)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com 或 192.168.1.1"
                className="framed-input font-mono"
              />
            </div>
          </div>

          {/* 卡片 3: 属性与详细数据 (Attributes) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>属性与详细数据 ({customFields.length})</span>
              <button
                type="button"
                onClick={handleAddField}
                className="btn-framed-blue"
              >
                <Plus style={{ width: 12, height: 12 }} />
                <span>添加自定义字段</span>
              </button>
            </div>

            {customFields.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'rgba(12, 16, 44, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 9,
                    }}
                  >
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                      placeholder="字段名称"
                      className="framed-input"
                      style={{ width: '35%', height: 34, fontSize: 12 }}
                    />

                    <input
                      type={field.isSecret ? 'password' : 'text'}
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                      placeholder="值 / 数据内容"
                      className="framed-input font-mono"
                      style={{ flex: 1, height: 34, fontSize: 12 }}
                    />

                    <button
                      type="button"
                      onClick={() => handleFieldChange(field.id, 'isSecret', !field.isSecret)}
                      className="btn-framed-icon"
                      style={{ width: 34, height: 34 }}
                      title={field.isSecret ? '设为明文' : '设为隐藏密文'}
                    >
                      {field.isSecret ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="btn-framed-icon danger"
                      style={{ width: 34, height: 34 }}
                      title="删除此字段"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px dashed rgba(255, 255, 255, 0.12)',
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#7E92C4',
                }}
              >
                暂无自定义属性，可点击右上角添加
              </div>
            )}
          </div>

          {/* 卡片 4: 常规安全备注 (General Notes) */}
          <div className="form-card">
            <div className="form-card-title">
              <span>常规安全备注 (General Notes)</span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录此资产的背景、口令提示或日常安全备忘..."
              className="framed-textarea"
            />
          </div>

          {/* 卡片 5: 副卡接管向导指示 (Takeover Guide) */}
          <div
            className="form-card"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.35)',
              background: 'linear-gradient(180deg, rgba(14, 25, 65, 0.8) 0%, rgba(18, 18, 55, 0.8) 100%)',
            }}
          >
            <div className="form-card-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00D4FF' }}>
                <Compass style={{ width: 16, height: 16 }} />
                <span>副卡接管向导指示 (Asset Takeover Guide)</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(0, 212, 255, 0.15)',
                  color: '#00D4FF',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  textTransform: 'none',
                }}
              >
                继承人专用
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: '#A4B8E4', lineHeight: 1.5 }}>
              当继承人在副介质（副卡/副U盘）上解锁此资产时，该指引将以最高优先级展示于「接管向导」中。
            </p>
            <textarea
              rows={3}
              value={inheritanceInstructions}
              onChange={(e) => setInheritanceInstructions(e.target.value)}
              placeholder="例：接管步骤1: 登录云控制台重置绑定手机；步骤2: 进入服务器终端轮换SSH私钥；步骤3: 检查自动续费扣款银行卡..."
              className="framed-textarea font-mono"
              style={{ fontSize: 12 }}
            />
          </div>
        </form>

        {/* 底部独立按钮栏 (加框美化) */}
        <div className="modal-window-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8EA4D4' }}>
            <ShieldCheck style={{ width: 16, height: 16, color: '#34D399' }} />
            <span>军规加密：保存后自动以 AES-256-GCM 封装写入</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-action-cancel"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-action-submit"
            >
              {initialItem ? '保存修改' : '创建项目'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
