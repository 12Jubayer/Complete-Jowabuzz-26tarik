export const adminSidebarMenu = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'LayoutGrid',
  },
  {
    id: 'manage-transaction',
    label: 'Manage Transaction',
    icon: 'BadgeDollarSign',
    children: [
      { id: 'transaction', label: 'Transaction', path: '/admin/transactions', icon: 'ArrowLeftRight' },
      { id: 'bonus', label: 'Bonus', path: '/admin/bonus', icon: 'Gift' },
      { id: 'deposit', label: 'Deposit', path: '/admin/deposit', icon: 'ArrowDownToLine' },
      { id: 'withdrawals', label: 'Withdrawals', path: '/admin/withdrawals', icon: 'ArrowUpFromLine' },
      {
        id: 'affiliates-release-list',
        label: 'Affiliates Release List',
        path: '/admin/affiliates-release-list',
        icon: 'HandCoins',
      },
    ],
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: 'User',
    children: [
      { id: 'players', label: 'Player', path: '/admin/players', icon: 'User' },
      { id: 'agents', label: 'Agent', path: '/admin/agents', icon: 'User' },
      {
        id: 'agent-applications',
        label: 'Agent Applications',
        path: '/admin/agent-applications',
        icon: 'ListChecks',
      },
      { id: 'e-wallet', label: 'E Wallet', path: '/admin/e-wallet', icon: 'Wallet' },
      { id: 'admin-manage', label: 'Admin Manage', path: '/admin/admin-manage', icon: 'Crown' },
    ],
  },
  {
    id: 'site-configuration',
    label: 'Site Configuration',
    icon: 'SlidersHorizontal',
    children: [
      { id: 'notice', label: 'Notice', path: '/admin/site-configuration/notice', icon: 'Bell' },
      { id: 'payment-method', label: 'Payment Method', path: '/admin/site-configuration/payment-method', icon: 'CreditCard' },
      { id: 'slider', label: 'Slider', path: '/admin/site-configuration/slider', icon: 'Image' },
      { id: 'social-links', label: 'Social Links', path: '/admin/site-configuration/social-links', icon: 'Share2' },
      { id: 'logo-icon', label: 'Logo & Icon', path: '/admin/site-configuration/logo-icon', icon: 'Globe' },
      { id: 'app-download', label: 'App Download', path: '/admin/site-configuration/app-download', icon: 'Smartphone' },
      {
        id: 'promotions',
        label: 'Promotions',
        path: '/admin/promotions',
        icon: 'Megaphone',
      },
    ],
  },
  {
    id: 'my-report',
    label: 'My Report',
    path: '/admin/my-report',
    icon: 'BarChart3',
  },
  {
    id: 'pending-settlement',
    label: 'Pending Settlement',
    path: '/admin/pending-settlement',
    icon: 'Clock',
  },
  {
    id: 'game-setting',
    label: 'Game Setting',
    icon: 'Gamepad2',
    children: [
      { id: 'hot-game', label: 'Hot Game', path: '/admin/games', gameTab: 'hot', icon: 'Flame' },
      {
        id: 'provider-setting',
        label: 'Provider Setting',
        path: '/admin/games',
        gameTab: 'provider',
        icon: 'Layers',
      },
      {
        id: 'all-game-setting',
        label: 'All Game Setting',
        path: '/admin/games',
        gameTab: 'all',
        icon: 'ListChecks',
      },
    ],
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/admin/profile',
    icon: 'UserCircle',
  },
  {
    id: 'vip-level',
    label: 'VIP Level',
    path: '/admin/vip-level',
    icon: 'Crown',
  },
  {
    id: 'game-images',
    label: 'Game Images',
    path: '/admin/game-images',
    icon: 'Image',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/admin/notifications',
    icon: 'Bell',
  },
  {
    id: 'live-chat',
    label: 'Live Chat',
    path: '/admin/live-chat',
    icon: 'MessageCircle',
  },
  {
    id: 'weekly-cashback',
    label: 'Weekly Cashback',
    path: '/admin/weekly-cashback',
    icon: 'Percent',
  },
  {
    id: 'popup-banner',
    label: 'Popup Banner',
    path: '/admin/popup-banner',
    icon: 'Megaphone',
  },
  {
    id: 'favourite-slider',
    label: 'Favourite Slider',
    path: '/admin/favourite-slider',
    icon: 'Image',
  },
  {
    id: 'affiliate-management',
    label: 'Affiliate Management',
    icon: 'Network',
    children: [
      { id: 'affiliate-users', label: 'Affiliate Users', path: '/admin/affiliate-users', icon: 'Users' },
      {
        id: 'affiliate-commission-settings',
        label: 'Commission Settings',
        path: '/admin/affiliate-commission-settings',
        icon: 'Percent',
      },
      {
        id: 'affiliate-settlement-settings',
        label: 'Settlement Settings',
        path: '/admin/affiliate-settlement-settings',
        icon: 'SlidersHorizontal',
      },
      {
        id: 'affiliate-referral-statistics',
        label: 'Referral Statistics',
        path: '/admin/affiliate-referral-statistics',
        icon: 'BarChart3',
      },
      {
        id: 'affiliate-banners',
        label: 'Affiliate Banners',
        path: '/admin/affiliate-banners',
        icon: 'Image',
      },
    ],
  },
  {
    id: 'agent-commission',
    label: 'Agent Commission',
    path: '/admin/agent-commission',
    icon: 'HandCoins',
  },
  {
    id: 'agent-commission-settings',
    label: 'Agent Commission Settings',
    path: '/admin/agent-commission/settings',
    icon: 'SlidersHorizontal',
  },
  {
    id: 'deposit-balance-bonus',
    label: 'Deposit Balance Bonus',
    path: '/admin/deposit-balance-bonus',
    icon: 'Gift',
  },
  {
    id: 'general-setting',
    label: 'General Setting',
    path: '/admin/general-setting',
    icon: 'Settings',
  },
];

export function flattenAdminRoutes(menu = adminSidebarMenu) {
  const routes = [];

  menu.forEach((item) => {
    if (item.path) {
      routes.push({ id: item.id, label: item.label, path: item.path });
    }
    if (item.children) {
      routes.push(...flattenAdminRoutes(item.children));
    }
  });

  return routes;
}

export function findAdminMenuItemByPath(pathname, menu = adminSidebarMenu) {
  for (const item of menu) {
    if (item.path === pathname) return item;
    if (item.children) {
      const found = findAdminMenuItemByPath(pathname, item.children);
      if (found) return found;
    }
  }
  return null;
}

export default adminSidebarMenu;
