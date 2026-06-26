export const SITE_URLS = {
  main: 'https://jowabuzz.com',
  affiliate: 'https://jowabuzzaffiliate.com',
};

const PRIVATE_AGENT_PREFIXES = [
  '/agent-app',
  '/jbcash-agent',
  '/agent/login',
  '/agent/dashboard',
  '/agent/transactions',
];

const MAIN_SITE_PATHS = new Set([
  '/',
  '/home',
  '/auth',
  '/promotions',
  '/vip',
  '/responsible-gaming',
  '/about-us',
  '/security',
  '/privacy-policy',
  '/faq',
  '/download',
  '/withdraw',
  '/deposit',
]);

export function getHostname() {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

function hostKey(hostname = getHostname()) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '');
}

export function isMainSiteHost(hostname = getHostname()) {
  return hostKey(hostname) === 'jowabuzz.com';
}

export function isAffiliateSiteHost(hostname = getHostname()) {
  return hostKey(hostname) === 'jowabuzzaffiliate.com';
}

export function isAgentLandingSiteHost(hostname = getHostname()) {
  return hostKey(hostname) === 'jowabuzz.shop';
}

export function isAgentLandingRoute(pathname = '') {
  const path = String(pathname || '').replace(/\/$/, '') || '/';
  return path === '/agent';
}

export function isPrivateAgentRoute(pathname = '') {
  const path = String(pathname || '');
  return PRIVATE_AGENT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isAgentRoute(pathname = '') {
  const path = String(pathname || '');
  return isAgentLandingRoute(path) || isPrivateAgentRoute(path);
}

export function isMoveCashDownloadPath(pathname = '') {
  return pathname.startsWith('/movecash/download/');
}

export function isAffiliateRoute(pathname = '') {
  return pathname === '/affiliate' || pathname.startsWith('/affiliate/');
}

export function isAffiliatePublicRoute(pathname = '') {
  return pathname === '/affiliate'
    || pathname === '/affiliate/login'
    || pathname === '/affiliate/signup';
}

export function isAffiliateDashboardRoute(pathname = '') {
  return isAffiliateRoute(pathname) && !isAffiliatePublicRoute(pathname);
}

export function isAdminRoute(pathname = '') {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isMainSiteRoute(pathname = '') {
  const path = String(pathname || '');
  if (MAIN_SITE_PATHS.has(path)) return true;
  if (path.startsWith('/profile')) return true;
  if (path.startsWith('/game') || path.startsWith('/cricket') || path.startsWith('/casino')) return true;
  return false;
}

export function getMainSiteFallbackPath(hostname = getHostname()) {
  return isAgentLandingSiteHost(hostname) ? '/agent' : '/';
}

export function markJBCashAppSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('jbcashApp', '1');
  }
}

export function isJBCashAppSession() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('jbcashApp') === '1';
}

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export function canAccessPrivateAgent(search = '') {
  if (isStandaloneDisplayMode()) return true;
  if (isJBCashAppSession()) return true;
  const query = search || (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(query);
  return params.get('from') === 'movecash';
}

export function getExternalRedirect(pathname = '', search = '', hash = '') {
  const suffix = `${search || ''}${hash || ''}`;

  if (isMoveCashDownloadPath(pathname)) {
    return null;
  }

  if (isMainSiteHost()) {
    return null;
  }

  if (isAdminRoute(pathname) && !isMainSiteHost()) {
    return `${SITE_URLS.main}${pathname}${suffix}`;
  }

  if (isAffiliateSiteHost()) {
    if (!isAffiliateRoute(pathname) && pathname !== '/') {
      if (isMainSiteRoute(pathname)) {
        return `${SITE_URLS.main}${pathname}${suffix}`;
      }
    }
    return null;
  }

  if (isAgentLandingSiteHost()) {
    if (isAffiliateRoute(pathname)) {
      return `${SITE_URLS.affiliate}${pathname}${suffix}`;
    }
    if (pathname !== '/' && isMainSiteRoute(pathname)) {
      return `${SITE_URLS.main}${pathname}${suffix}`;
    }
    return null;
  }

  return null;
}

export function isJBCashBrandingAsset(url = '') {
  const value = String(url || '').toLowerCase();
  return value.includes('jbcash') || value.includes('/movecash/');
}

export function getMainSiteLogoSrc(logoUrl = '') {
  const value = String(logoUrl || '').trim();
  if (value && !isJBCashBrandingAsset(value)) {
    return value;
  }
  return MAIN_SITE_LOGO_FALLBACK;
}

export function getLogoContext(pathname = '', hostname = getHostname()) {
  if (isMainSiteHost(hostname)) {
    return 'main';
  }
  if (isPrivateAgentRoute(pathname)) {
    return 'jbcash';
  }
  if (isAffiliateSiteHost(hostname) || isAffiliateRoute(pathname)) {
    return 'affiliate';
  }
  return 'main';
}

export const JBCASH_LOGO_SRC = '/logos/jbcash-logo.png';
export const MAIN_SITE_LOGO_FALLBACK = '/images/logo.png';
export const MAIN_SITE_FAVICON = '/images/logo.png';
export const AFFILIATE_LOGO_SRC = '/logos/affiliate-logo.png';
export const MAIN_SITE_CANONICAL = 'https://jowabuzz.com';
export const MAIN_SITE_TITLE = 'Jowabuzz - Cricket Exchange & Casino';
