import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  FileText,
  CreditCard,
  Award,
  Gamepad2,
  Shield,
  Sliders,
} from 'lucide-react';
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
      customFields: customFields.filter((f) => f.name.trim() !== ''),
      createdAt: initialItem?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(item);
    onClose();
  };

  const getCategoryIcon = (cat: VaultCategory) => {
    switch (cat) {
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-purple-400" />;
      case 'login':
        return <KeyRound className="w-4 h-4 text-cyan-400" />;
      case 'note':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'license':
        return <Award className="w-4 h-4 text-rose-400" />;
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121A2B] border border-white/10 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* 1Password 风格头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0E1525]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1C283F] border border-white/10 flex items-center justify-center">
              {getCategoryIcon(category)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {initialItem ? '编辑数字遗产项目' : '新建数字遗产项目'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                数据以军规级 AES-256-GCM 离线加密存储
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {/* 分类与标题 */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VaultCategory)}
                  className="op-input font-medium"
                >
                  <option value="login">登录凭据 (Logins)</option>
                  <option value="game">游戏遗产 (Steam/Epic)</option>
                  <option value="note">安全便签 (Secure Notes)</option>
                  <option value="card">财务卡片 (Credit Cards)</option>
                  <option value="license">软件许可 (Licenses)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  项目标题 *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如: Steam 游戏库 / 瑞士信贷银行"
                  className="op-input font-medium"
                />
              </div>
            </div>
          </div>

          {/* 登录详情分组 */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block px-1">
              登录信息 (LOGIN)
            </span>

            <div className="op-field-group">
              <div className="p-3 border-b border-white/5">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  用户名 / 账号凭证
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名、邮箱或账号识别码"
                  className="op-input font-mono text-xs"
                />
              </div>

              <div className="p-3 border-b border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono text-slate-400">
                    密码 (PASSWORD)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="text-[11px] text-[#0572EC] hover:text-[#00D4FF] flex items-center gap-1 font-medium"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>{showGenerator ? '收起生成器' : '密码生成器'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码或点击右侧生成"
                    className="op-input pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* 1Password 内置密码生成器展开面板 */}
                {showGenerator && (
                  <div className="p-3 rounded-lg bg-[#0E1525] border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono">
                        长度: {genLength} 位字符
                      </span>
                      <button
                        type="button"
                        onClick={() => generatePassword()}
                        className="op-btn-secondary text-[11px] py-1 px-2.5"
                      >
                        <RefreshCw className="w-3 h-3 text-[#00D4FF]" />
                        <span>重新生成</span>
                      </button>
                    </div>

                    <input
                      type="range"
                      min={12}
                      max={36}
                      value={genLength}
                      onChange={(e) => {
                        const len = Number(e.target.value);
                        setGenLength(len);
                        generatePassword(len);
                      }}
                      className="w-full accent-[#0572EC] cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSymbols}
                          onChange={(e) => {
                            setIncludeSymbols(e.target.checked);
                            generatePassword(genLength, e.target.checked);
                          }}
                        />
                        <span>包含特殊符号 (!@#$...)</span>
                      </label>
                      <span className="text-emerald-400 font-mono">
                        军规强度
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">
                  服务网址 (URL)
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="op-input font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* 继承人遗嘱与嘱托备忘录 */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block px-1">
              继承人离世后指示 (HERITAGE WILL)
            </span>
            <div className="op-field-group p-3">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="详细说明此资产在双U盘解锁后的操作指示，例如：2FA备用恢复码位置、银行保管箱钥匙所在等..."
                className="op-input resize-none text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* 自定义敏感字段 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                自定义附加字段
              </span>
              <button
                type="button"
                onClick={handleAddField}
                className="text-xs text-[#0572EC] hover:text-[#00D4FF] flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加字段</span>
              </button>
            </div>

            {customFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) =>
                    handleFieldChange(field.id, 'name', e.target.value)
                  }
                  placeholder="字段名称"
                  className="op-input flex-1 text-xs"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    handleFieldChange(field.id, 'value', e.target.value)
                  }
                  placeholder="字段内容"
                  className="op-input flex-1 font-mono text-xs"
                />
                <label className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.isSecret}
                    onChange={(e) =>
                      handleFieldChange(field.id, 'isSecret', e.target.checked)
                    }
                  />
                  <span>隐藏</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveField(field.id)}
                  className="p-1.5 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 底部操作条 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="op-btn-secondary text-xs"
            >
              取消
            </button>
            <button type="submit" className="op-btn-primary text-xs px-5">
              保存到遗产库
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
