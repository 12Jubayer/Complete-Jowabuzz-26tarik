import {
  AFFILIATE_LOGO_SRC,
  canAccessPrivateAgent,
  isAdminRoute,
  isAffiliateRoute,
  isAffiliateDashboardRoute,
  isAffiliateSiteHost,
  isAgentLandingSiteHost,
  isAgentRoute,
  isJBCashAppSession,
  isMainSiteHost,
  isPrivateAgentRoute,
  isStandaloneDisplayMode,
  JBCASH_LOGO_SRC,
  MAIN_SITE_LOGO_FALLBACK,
} from './siteContext';

export const APP_LAUNCH_MODES = {
  MAIN: 'main',
  JBCASH: 'jbcash',
  AFFILIATE: 'affiliate',
};

const MAIN_SPLASH_SEEN_KEY = 'mainAppSplashSeen';
const JBCASH_SPLASH_SEEN_KEY = 'jbcashAppSplashSeen';
const AFFILIATE_SPLASH_SEEN_KEY = 'affiliateAppSplashSeen';

export function detectAppLaunchMode(pathname = '', search = '') {
  if (isMainSiteHost()) {
    return APP_LAUNCH_MODES.MAIN;
  }

  if (isAffiliateSiteHost()) {
    return APP_LAUNCH_MODES.AFFILIATE;
  }

  if (
    isPrivateAgentRoute(pathname)
    || pathname === '/agent-app'
    || pathname === '/jbcash-agent'
    || isJBCashAppSession()
    || canAccessPrivateAgent(search)
    || (isAgentLandingSiteHost() && isStandaloneDisplayMode())
  ) {
    return APP_LAUNCH_MODES.JBCASH;
  }

  if (isAffiliateRoute(pathname) && isStandaloneDisplayMode()) {
    return APP_LAUNCH_MODES.AFFILIATE;
  }

  return APP_LAUNCH_MODES.MAIN;
}

export function shouldShowLaunchSplash(mode) {
  if (!isStandaloneDisplayMode()) return false;
  if (mode === APP_LAUNCH_MODES.MAIN && !isMainSiteHost()) return false;
  if (mode === APP_LAUNCH_MODES.JBCASH && isMainSiteHost()) return false;

  if (mode === APP_LAUNCH_MODES.MAIN) {
    return !sessionStorage.getItem(MAIN_SPLASH_SEEN_KEY);
  }
  if (mode === APP_LAUNCH_MODES.JBCASH) {
    return !sessionStorage.getItem(JBCASH_SPLASH_SEEN_KEY);
  }
  if (mode === APP_LAUNCH_MODES.AFFILIATE) {
    return !sessionStorage.getItem(AFFILIATE_SPLASH_SEEN_KEY);
  }

  return false;
}

export function markLaunchSplashSeen(mode) {
  if (mode === APP_LAUNCH_MODES.MAIN) {
    sessionStorage.setItem(MAIN_SPLASH_SEEN_KEY, '1');
  } else if (mode === APP_LAUNCH_MODES.JBCASH) {
    sessionStorage.setItem(JBCASH_SPLASH_SEEN_KEY, '1');
  } else if (mode === APP_LAUNCH_MODES.AFFILIATE) {
    sessionStorage.setItem(AFFILIATE_SPLASH_SEEN_KEY, '1');
  }
}

export function getLaunchDestination(mode, { agentAuthenticated = false, affiliateAuthenticated = false } = {}) {
  if (mode === APP_LAUNCH_MODES.MAIN) {
    return '/';
  }
  if (mode === APP_LAUNCH_MODES.JBCASH) {
    return agentAuthenticated ? '/agent/dashboard' : '/agent/login';
  }
  if (mode === APP_LAUNCH_MODES.AFFILIATE) {
    return affiliateAuthenticated ? '/affiliate/dashboard' : '/affiliate/login';
  }
  return '/';
}

export function isBlockedLaunchPathOnMainSite(pathname = '') {
  if (isAdminRoute(pathname)) {
    return false;
  }

  return (
    pathname === '/agent-app'
    || pathname === '/jbcash-agent'
    || isAgentRoute(pathname)
    || isAffiliateDashboardRoute(pathname)
    || pathname.startsWith('/movecash/')
  );
}

export function getSplashBranding(mode) {
  if (mode === APP_LAUNCH_MODES.JBCASH) {
    return {
      logoSrc: JBCASH_LOGO_SRC,
      title: 'JBCash',
      background: '#000000',
      theme: '#059669',
    };
  }

  if (mode === APP_LAUNCH_MODES.AFFILIATE) {
    return {
      logoSrc: AFFILIATE_LOGO_SRC,
      title: 'JowaBuzz Affiliate',
      background: '#1e1033',
      theme: '#7C3AED',
    };
  }

  return {
    logoSrc: MAIN_SITE_LOGO_FALLBACK,
    title: 'Jowabuzz',
    background: '#0b1220',
    theme: '#0b1220',
  };
}

export function getLaunchSplashDuration(mode) {
  if (mode === APP_LAUNCH_MODES.MAIN) return 700;
  return 1000;
}
