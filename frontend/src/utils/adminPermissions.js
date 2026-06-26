import { adminSidebarMenu, findAdminMenuItemByPath } from '../data/adminSidebarMenu';

export const ADMIN_PERMISSION_OPTIONS = [
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'manage_deposits', label: 'Manage Deposits' },
  { key: 'manage_withdrawals', label: 'Manage Withdrawals' },
  { key: 'manage_games', label: 'Manage Games' },
  { key: 'manage_bonuses', label: 'Manage Bonuses' },
  { key: 'manage_chat', label: 'Manage Chat' },
  { key: 'site_settings', label: 'Site Settings' },
  { key: 'view_reports', label: 'View Reports' },
];

const SUPER_ADMIN_ONLY = '__super_admin__';

export const ADMIN_MENU_PERMISSIONS = {
  dashboard: null,
  profile: null,
  transaction: ['manage_deposits', 'manage_withdrawals', 'manage_bonuses'],
  bonus: ['manage_bonuses'],
  deposit: ['manage_deposits'],
  withdrawals: ['manage_withdrawals'],
  'affiliates-release-list': ['manage_withdrawals'],
  players: ['manage_users'],
  agents: ['manage_users'],
  'agent-applications': ['manage_users'],
  'e-wallet': ['manage_users'],
  'admin-manage': SUPER_ADMIN_ONLY,
  notice: ['site_settings'],
  'payment-method': ['site_settings'],
  slider: ['site_settings'],
  'social-links': ['site_settings'],
  'logo-icon': ['site_settings'],
  'app-download': ['site_settings'],
  promotions: ['manage_bonuses'],
  'my-report': ['view_reports'],
  'pending-settlement': SUPER_ADMIN_ONLY,
  'hot-game': ['manage_games'],
  'provider-setting': ['manage_games'],
  'all-game-setting': ['manage_games'],
  'vip-level': ['manage_bonuses'],
  'game-images': ['manage_games'],
  notifications: ['site_settings'],
  'live-chat': ['manage_chat'],
  'weekly-cashback': ['manage_bonuses'],
  'popup-banner': ['manage_bonuses'],
  'favourite-slider': ['site_settings'],
  'deposit-balance-bonus': ['manage_bonuses'],
  'affiliate-users': SUPER_ADMIN_ONLY,
  'affiliate-commission-settings': SUPER_ADMIN_ONLY,
  'affiliate-settlement-settings': SUPER_ADMIN_ONLY,
  'affiliate-referral-statistics': SUPER_ADMIN_ONLY,
  'affiliate-banners': SUPER_ADMIN_ONLY,
  'agent-commission': SUPER_ADMIN_ONLY,
  'agent-commission-settings': SUPER_ADMIN_ONLY,
  'general-setting': SUPER_ADMIN_ONLY,
};

const ALWAYS_ALLOWED_PATHS = ['/admin/dashboard', '/admin/profile'];

const SUPER_ADMIN_PATH_PREFIXES = [
  '/admin/admin-manage',
  '/admin/pending-settlement',
  '/admin/affiliate-',
  '/admin/agent-commission',
  '/admin/general-setting',
];

const PATH_RULES = [
  {
    test: (pathname) => pathname.startsWith('/admin/games'),
    permissions: ['manage_games'],
  },
];

export function isSuperAdmin(admin) {
  return admin?.role === 'super_admin';
}

export function hasAdminPermission(admin, permissionKey) {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;

  const permissions = admin.permissions;
  if (!permissions || typeof permissions !== 'object') {
    return false;
  }

  return Boolean(permissions[permissionKey]);
}

export function hasAnyAdminPermission(admin, permissionKeys = []) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return false;
  if (isSuperAdmin(admin)) return true;
  return permissionKeys.some((key) => hasAdminPermission(admin, key));
}

export function getMenuItemPermission(menuItemId) {
  if (!Object.prototype.hasOwnProperty.call(ADMIN_MENU_PERMISSIONS, menuItemId)) {
    return undefined;
  }
  return ADMIN_MENU_PERMISSIONS[menuItemId];
}

export function canAccessMenuItem(admin, menuItemId) {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;

  const permissions = getMenuItemPermission(menuItemId);
  if (permissions === null) return true;
  if (permissions === undefined) return false;
  if (permissions === SUPER_ADMIN_ONLY) return false;

  return hasAnyAdminPermission(admin, permissions);
}

export function filterAdminSidebarMenu(menu, admin) {
  if (!admin) return [];

  return menu
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((child) => canAccessMenuItem(admin, child.id));
        if (!children.length) return null;
        return { ...item, children };
      }

      return canAccessMenuItem(admin, item.id) ? item : null;
    })
    .filter(Boolean);
}

export function isAdminPathAllowed(admin, pathname) {
  if (!admin) return false;
  if (isSuperAdmin(admin)) return true;

  if (ALWAYS_ALLOWED_PATHS.includes(pathname)) {
    return true;
  }

  if (SUPER_ADMIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  const menuItem = findAdminMenuItemByPath(pathname, adminSidebarMenu);
  if (menuItem) {
    return canAccessMenuItem(admin, menuItem.id);
  }

  const pathRule = PATH_RULES.find((rule) => rule.test(pathname));
  if (pathRule) {
    return hasAnyAdminPermission(admin, pathRule.permissions);
  }

  return false;
}

export function buildEmptyPermissions() {
  return ADMIN_PERMISSION_OPTIONS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});
}

export default {
  ADMIN_PERMISSION_OPTIONS,
  ADMIN_MENU_PERMISSIONS,
  isSuperAdmin,
  hasAdminPermission,
  hasAnyAdminPermission,
  canAccessMenuItem,
  filterAdminSidebarMenu,
  isAdminPathAllowed,
  buildEmptyPermissions,
};
