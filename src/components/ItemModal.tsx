import React, { useState, useEffect } from 'react';
import { X, KeyRound, Plus, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { VaultCategory, VaultField, VaultItem } from '../types';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
  initialItem?: VaultItem | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<VaultField[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setCategory(initialItem.category);
      setUsername(initialItem.username || '');
      setPassword(initialItem.password || '');
      setUrl(initialItem.url || '');
      setNotes(initialItem.notes || '');
      setCustomFields(initialItem.customFields || []);
    } else {
      setTitle('');
      setCategory('login');
      setUsername('');
      setPassword('');
      setUrl('');
      setNotes('');
      setCustomFields([]);
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let result = '';
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
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
      customFields: customFields.filter((f) => f.name.trim() !== ''),
      createdAt: initialItem?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0A1C30] border border-[#1F2937] rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2937]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#00D4FF]" />
            <h3 className="text-base font-semibold text-white">
              {initialItem ? '编辑数字遗产资产' : '添加新数字遗产凭证'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* 资产分类与标题 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VaultCategory)}
                className="vault-input"
              >
                <option value="login">登录账号 (Web/App)</option>
                <option value="game">游戏资产 (Steam/Epic)</option>
                <option value="note">安全备忘 (信托/保管箱)</option>
                <option value="card">支付卡片 (银行/结算)</option>
                <option value="license">产品授权 (软件/Key)</option>
                <option value="identity">身份凭据 (证件/信令)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                资产标题 *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Steam 游戏典藏库 / 瑞士信贷主保管箱"
                className="vault-input"
              />
            </div>
          </div>

          {/* 账号与密码 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                用户名 / 账号ID
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com 或 账号ID"
                className="vault-input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  密码 / 安全代码
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-[#00D4FF] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  随机高强密码
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="军规加密存储的密码"
                  className="vault-input pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 关联网站 / 服务 URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              服务入口 / 网站地址 (可选)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="vault-input"
            />
          </div>

          {/* 嘱托备忘录 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              继承人提示 & 资产说明 (安全备忘)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="详细说明此资产在离世后的操作方式、二次验证器备份码、实体钥匙存放位置等..."
              className="vault-input resize-none"
            />
          </div>

          {/* 自定义字段 */}
          <div className="border-t border-[#1F2937] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                自定义凭据字段 (安全问题、PIN码、助记词)
              </span>
              <button
                type="button"
                onClick={handleAddField}
                className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                添加字段
              </button>
            </div>

            {customFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) =>
                    handleFieldChange(field.id, 'name', e.target.value)
                  }
                  placeholder="字段名 (如: 助记词/CVV)"
                  className="vault-input flex-1"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    handleFieldChange(field.id, 'value', e.target.value)
                  }
                  placeholder="字段值"
                  className="vault-input flex-1 font-mono"
                />
                <label className="flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.isSecret}
                    onChange={(e) =>
                      handleFieldChange(field.id, 'isSecret', e.target.checked)
                    }
                  />
                  隐藏
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              取消
            </button>
            <button type="submit" className="btn-primary text-xs">
              保存至加密遗产库
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
