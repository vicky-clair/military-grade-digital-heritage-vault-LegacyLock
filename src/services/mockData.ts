import { VaultItem } from '../types';

export const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: 'item-steam-1',
    title: 'Steam 核心游戏主库 (含CS2皮肤与库藏)',
    category: 'game',
    username: 'hermes_legacy',
    password: 'P@ssw0rd!Steam_2026',
    url: 'https://steamcommunity.com',
    notes: '内含大量典藏游戏与库存饰品，Steam Guard 备用恢复代码保存在安全笔记中。',
    customFields: [
      { id: 'f-1', name: '账号绑定邮箱', value: 'legacy_gamer@vault.net', isSecret: false },
      { id: 'f-2', name: '备用验证码R代号', value: 'R98421-XB273-MM998', isSecret: true },
      { id: 'f-3', name: '库存估值', value: '￥28,500 RMB', isSecret: false }
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'item-bank-safe-2',
    title: '招商银行私人保管箱及家族信托凭据',
    category: 'note',
    username: '主保管箱 084 号',
    password: 'SAFE-PIN: 882914',
    url: '',
    notes: '保管箱钥匙位于书房保险柜第二层红色锦盒内。内含祖传地契、黄金凭证及原始房产证。',
    customFields: [
      { id: 'f-4', name: '经办客户经理', value: '陈经理 138-0000-8888', isSecret: false },
      { id: 'f-5', name: '开箱附带口令', value: '天行健君子自强不息', isSecret: true }
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'item-apple-3',
    title: 'Apple ID 主账号 (iCloud 照片与购买授权)',
    category: 'login',
    username: 'vicky_family@icloud.com',
    password: 'AppleSec#Vault2026!',
    url: 'https://appleid.apple.com',
    notes: '存有过去 15 年的全家高清相册、家庭录像以及已购买的大量专业音频生产力软件。',
    customFields: [
      { id: 'f-6', name: '信任电话号码', value: '+86 139-****-8899', isSecret: false },
      { id: 'f-7', name: '恢复密钥 (Recovery Key)', value: 'AK-9821-3942-8821-4991', isSecret: true }
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'item-card-4',
    title: '瑞士私人银行数字离岸托管账户',
    category: 'card',
    username: 'Vicky Clair',
    password: 'PIN: 9102',
    url: 'https://ebanking.swissvault.ch',
    notes: '双币种国际结算卡，绑定资产信托分红自动划拨账户。',
    customFields: [
      { id: 'f-8', name: '卡号', value: '4532 9018 7721 0092', isSecret: false },
      { id: 'f-9', name: '安全码 CVV', value: '839', isSecret: true },
      { id: 'f-10', name: '有效期', value: '11/30', isSecret: false }
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'item-license-5',
    title: 'JetBrains All Products Pack 终身企业授权',
    category: 'license',
    username: 'Enterprise Legacy License',
    password: 'JB-LIC-2026-X889-LEGACY-LOCK',
    url: 'https://account.jetbrains.com',
    notes: '商用终生全套工具包授权密钥，继承人可继续用于软件开发与科研工作。',
    customFields: [
      { id: 'f-11', name: '授权席位', value: '5 Seats Floating', isSecret: false }
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
  }
];
