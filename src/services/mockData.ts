/**
 * ============================================================================
 * LegacyLock 军规遗产密钥库 — 初始演示与开箱资产数据集 (Seed / Mock Data)
 * ============================================================================
 * 
 * 作用说明：
 * 1. 在用户首次启动且尚未录入资产时，提供高拟真度的 12 维数字资产样本（账号、卡片、助记词、私钥等）；
 * 2. 指引用户体验军规掩码查看、20位密码发生器、自定义字段与双钥匙加密流程；
 * 3. 用户录入或导入新资产后，本地加密存储将无缝覆盖接管，不影响真实数据流。
 */

import { VaultItem } from '../types';

/**
 * 初始开箱示例资产列表
 */
export const INITIAL_VAULT_ITEMS: VaultItem[] = [
  {
    id: 'item-apple-3',
    title: 'Apple ID 主账号 (iCloud 照片与生产力购买授权)',
    category: 'login',
    username: 'vicky_family@icloud.com',
    password: 'AppleSec#Vault2026!',
    url: 'https://appleid.apple.com',
    notes: '存有过去 15 年的全家高清相册、家庭录像以及已购买的大量专业音频生产力软件。',
    customFields: [
      { id: 'f-6', name: '信任电话号码', value: '+86 139-****-8899', isSecret: false },
      { id: 'f-7', name: '恢复密钥 (Recovery Key)', value: 'AK-9821-3942-8821-4991', isSecret: true },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'item-card-4',
    title: '瑞士私人银行数字离岸万事达卡',
    category: 'card',
    username: 'Vicky Clair',
    password: 'PIN: 9102',
    url: 'https://ebanking.swissvault.ch',
    notes: '双币种国际结算卡，绑定资产信托分红自动划拨账户。',
    customFields: [
      { id: 'f-8', name: '卡号', value: '4532 9018 7721 0092', isSecret: false },
      { id: 'f-9', name: '安全码 (CVV)', value: '839', isSecret: true },
      { id: 'f-10', name: '有效期', value: '11/30', isSecret: false },
      { id: 'f-10-b', name: '发卡行', value: 'Credit Suisse Private Banking', isSecret: false },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 120,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
  {
    id: 'item-crypto-1',
    title: 'Ledger 硬件冷钱包 (比特币与以太坊主备用)',
    category: 'cryptoWallet',
    username: '0x71C...4b92 (ETH) / bc1q...88a1 (BTC)',
    password: 'PIN: 882914',
    url: '',
    notes: '内含家庭长期定投的加密信托资产。冷钱包硬件实体保存在主保险柜内。',
    customFields: [
      {
        id: 'f-c1',
        name: '12/24 位助记词 (Seed Phrase)',
        value: 'abandon amount liar churn expand puzzle logic dynamic quantum marble pulse crystal',
        isSecret: true,
      },
      { id: 'f-c2', name: '主链网络', value: 'Bitcoin Mainnet / Ethereum', isSecret: false },
      { id: 'f-c3', name: '冷钱包 PIN', value: '882914', isSecret: true },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 150,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'item-ssh-1',
    title: '家族核心服务器群及运维 SSH 根密钥',
    category: 'sshKey',
    username: 'root@prod-cluster.family.org',
    password: 'Passphrase: LegacySec$2026',
    url: 'ssh://prod-cluster.family.org:22',
    notes: '用于维护所有远程私有云主机、自动备份流水线及家庭照片私有云 NAS。',
    customFields: [
      {
        id: 'f-s1',
        name: '私钥 (Private Key)',
        value: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACBAv90F5x4q...LEGACY_LOCK_RSA_ED25519_KEY...\n-----END OPENSSH PRIVATE KEY-----',
        isSecret: true,
      },
      { id: 'f-s2', name: '指纹 (Fingerprint)', value: 'SHA256:4d/N89k+M32xLa8201...Ed25519', isSecret: false },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 80,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
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
      { id: 'f-5', name: '开箱附带口令', value: '天行健君子自强不息', isSecret: true },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'item-passport-1',
    title: '中华人民共和国因私普通护照',
    category: 'passport',
    username: 'CLAIR / VICKY',
    password: '',
    url: '',
    notes: '包含多年期赴欧申根签证及美签。实体证件存放于书房二号档案袋。',
    customFields: [
      { id: 'f-p1', name: '护照号码', value: 'E98214732', isSecret: false },
      { id: 'f-p2', name: '签发国', value: '中国 (CHN)', isSecret: false },
      { id: 'f-p3', name: '到期日期', value: '2034-08-15', isSecret: false },
      { id: 'f-p4', name: '出生日期', value: '1988-06-21', isSecret: false },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 200,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
  },
  {
    id: 'item-router-1',
    title: '家庭主千兆光纤无线路由器 & WiFi 6E',
    category: 'router',
    username: 'admin',
    password: 'WiFiPass@Home_2026!',
    url: 'http://192.168.1.1',
    notes: '主路由具备访客网络与家庭 IoT 隔离策略。管理口令切勿重置以免智能家居掉线。',
    customFields: [
      { id: 'f-r1', name: '无线网络名称 (SSID)', value: 'HeritageNet_5G_Pro', isSecret: false },
      { id: 'f-r2', name: 'WiFi 连接密码', value: 'WiFiPass@Home_2026!', isSecret: true },
      { id: 'f-r3', name: '路由器管理地址', value: '192.168.1.1', isSecret: false },
      { id: 'f-r4', name: '后台管理密码', value: 'RouterAdmin#8899', isSecret: true },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: 'item-server-1',
    title: '家庭私有云存储服务器 (TrueNAS 48TB)',
    category: 'server',
    username: 'root',
    password: 'NAS_RootPass#2026',
    url: 'https://nas.local:8443',
    notes: '48TB 阵列内包含 20 年家庭高清纪录片备份、个人科研源码与冷数据加密归档。',
    customFields: [
      { id: 'f-srv1', name: '局域网 IP', value: '192.168.1.200', isSecret: false },
      { id: 'f-srv2', name: '阵列模式', value: 'RAID-Z2 双盘冗余', isSecret: false },
      { id: 'f-srv3', name: '管理口令', value: 'NAS_RootPass#2026', isSecret: true },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 100,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
  {
    id: 'item-license-5',
    title: 'JetBrains All Products Pack 终身企业授权',
    category: 'softwareLicense',
    username: 'Enterprise Legacy License',
    password: 'JB-LIC-2026-X889-LEGACY-LOCK',
    url: 'https://account.jetbrains.com',
    notes: '商用终生全套工具包授权密钥，继承人可继续用于软件开发与科研工作。',
    customFields: [
      { id: 'f-11', name: '许可证密钥', value: 'JB-LIC-2026-X889-LEGACY-LOCK', isSecret: false },
      { id: 'f-12', name: '授权席位', value: '5 Seats Floating', isSecret: false },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
  },
  {
    id: 'item-steam-1',
    title: 'Steam 核心游戏主库 (含CS2饰品与库藏)',
    category: 'game',
    username: 'hermes_legacy',
    password: 'P@ssw0rd!Steam_2026',
    url: 'https://steamcommunity.com',
    notes: '内含大量典藏游戏与库存饰品，Steam Guard 备用恢复代码保存在安全笔记中。',
    customFields: [
      { id: 'f-1', name: '账号绑定邮箱', value: 'legacy_gamer@vault.net', isSecret: false },
      { id: 'f-2', name: '备用验证码R代号', value: 'R98421-XB273-MM998', isSecret: true },
      { id: 'f-3', name: '库存估值', value: '￥28,500 RMB', isSecret: false },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
];
