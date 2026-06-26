import { hasAdminPermission } from '../services/adminManageService.js';

const AUTH_ONLY_PREFIXES = ['/me', '/profile', '/dashboard-stats'];

const SUPER_ADMIN_PATH_PATTERNS = [
  /^\/sub-admins(\/|$)/,
  /^\/admins(\/|$)/,
  /^\/affiliates(\/|$)/,
  /^\/affiliate(\/|$)/,
  /^\/agent-commission(\/|$)/,
  /^\/general-settings(\/|$)/,
  /^\/commission-settings(\/|$)/,
  /^\/gaming-api-settings(\/|$)/,
  /^\/sms-settings(\/|$)/,
  /^\/movecash(\/|$)/,
];

const ROUTE_RULES = [
  {
    test: (path) => /^\/players(\/|$)/.test(path),
    permissions: ['manage_users'],
  },
  {
    test: (path) => /^\/agent-applications(\/|$)/.test(path),
    permissions: ['manage_users'],
  },
  {
    test: (path) => /^\/agents(\/|$)/.test(path),
    permissions: ['manage_users'],
  },
  {
    test: (path) => /^\/e-wallets(\/|$)/.test(path),
    permissions: ['manage_users'],
  },
  {
    test: (path) => /^\/deposits(\/|$)/.test(path),
    permissions: ['manage_deposits'],
  },
  {
    test: (path) => /^\/withdrawals(\/|$)/.test(path),
    permissions: ['manage_withdrawals'],
  },
  {
    test: (path) => /^\/affiliates-release-list(\/|$)/.test(path),
    permissions: ['manage_withdrawals'],
  },
  {
    test: (path) => /^\/affiliate-release(\/|$)/.test(path),
    permissions: ['manage_withdrawals'],
  },
  {
    test: (path) =>
      /^\/transactions(\/|$)/.test(path) || /^\/dashboard\/transactions(\/|$)/.test(path),
    permissions: ['manage_deposits', 'manage_withdrawals', 'manage_bonuses'],
  },
  {
    test: (path) =>
      /^\/bonus(\/|$)/.test(path) ||
      /^\/bonus-turnover(\/|$)/.test(path) ||
      /^\/bonus-progress(\/|$)/.test(path) ||
      /^\/deposit-bonus(\/|$)/.test(path) ||
      /^\/weekly-cashback(\/|$)/.test(path) ||
      /^\/popup-banners(\/|$)/.test(path) ||
      /^\/vip-levels(\/|$)/.test(path) ||
      /^\/promotions(\/|$)/.test(path),
    permissions: ['manage_bonuses'],
  },
  {
    test: (path) =>
      /^\/games(\/|$)/.test(path) ||
      /^\/hot-games(\/|$)/.test(path) ||
      /^\/providers(\/|$)/.test(path) ||
      /^\/game-images(\/|$)/.test(path) ||
      /^\/upload\/game-image(\/|$)/.test(path),
    permissions: ['manage_games'],
  },
  {
    test: (path) =>
      /^\/live-chat(\/|$)/.test(path) ||
      /^\/chat\/(faqs|settings)(\/|$)/.test(path),
    permissions: ['manage_chat'],
  },
  {
    test: (path) =>
      /^\/site-config(\/|$)/.test(path) ||
      /^\/notifications(\/|$)/.test(path) ||
      /^\/favourite-sliders(\/|$)/.test(path) ||
      /^\/upload\/(slider-image|logo|favicon|promotion-image)(\/|$)/.test(path),
    permissions: ['site_settings'],
  },
  {
    test: (path) => /^\/reports(\/|$)/.test(path) || /^\/game-reports(\/|$)/.test(path),
    permissions: ['view_reports'],
  },
];

function isSuperAdminOnlyPath(apiPath) {
  return SUPER_ADMIN_PATH_PATTERNS.some((pattern) => pattern.test(apiPath));
}

function isRestrictedSubAdminAction(apiPath, method = 'GET') {
  const upper = String(method || 'GET').toUpperCase();

  if (upper === 'DELETE') {
    return true;
  }

  if (/adjust-balance/.test(apiPath)) {
    return true;
  }

  if (/\/settlements\/[^/]+\/(approve|reject|generate)/.test(apiPath)) {
    return true;
  }

  if (/\/affiliate\/settlement\/(complete|reject)/.test(apiPath)) {
    return true;
  }

  if (/\/affiliate\/settle/.test(apiPath)) {
    return true;
  }

  return false;
}

export function getAdminApiPath(req) {
  const base = String(req.baseUrl || '');
  const path = String(req.path || '');
  const combined = `${base}${path}`.replace(/\/+/g, '/');
  return combined.replace(/^\/api\/admin/, '') || path;
}

export function isAuthOnlyAdminPath(apiPath) {
  return AUTH_ONLY_PREFIXES.some(
    (prefix) => apiPath === prefix || apiPath.startsWith(`${prefix}/`),
  );
}

export function canAccessAdminApiPath(admin, apiPath, req = null) {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;
  if (isAuthOnlyAdminPath(apiPath)) return true;

  if (isSuperAdminOnlyPath(apiPath)) {
    return false;
  }

  if (isRestrictedSubAdminAction(apiPath, req?.method)) {
    return false;
  }

  const rule = ROUTE_RULES.find((item) => item.test(apiPath));
  if (!rule) {
    return false;
  }

  if (rule.superAdminOnly) {
    return false;
  }

  return rule.permissions.some((permission) => hasAdminPermission(admin, permission));
}

export default {
  getAdminApiPath,
  isAuthOnlyAdminPath,
  canAccessAdminApiPath,
};
