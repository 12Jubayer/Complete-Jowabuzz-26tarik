import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAgentAuth } from '../context/AgentAuthContext';
import {
  canAccessPrivateAgent,
  getExternalRedirect,
  getMainSiteFallbackPath,
  getMainSiteLogoSrc,
  isAdminRoute,
  isAffiliateRoute,
  isAffiliateSiteHost,
  isAgentLandingRoute,
  isAgentLandingSiteHost,
  isAgentRoute,
  isMainSiteHost,
  isMainSiteRoute,
  isMoveCashDownloadPath,
  isPrivateAgentRoute,
  isStandaloneDisplayMode,
  MAIN_SITE_CANONICAL,
  MAIN_SITE_FAVICON,
  MAIN_SITE_TITLE,
  markJBCashAppSession,
} from '../utils/siteContext';

const JB_CASH_SHOP_ORIGIN = 'https://jowabuzz.shop';

function isBlockedOnMainSite(pathname = '') {
  return (
    isAgentRoute(pathname)
    || isMoveCashDownloadPath(pathname)
    || pathname === '/agent-app'
    || pathname === '/jbcash-agent'
  );
}

function getShopAgentRedirect(pathname = '', search = '', hash = '') {
  const suffix = `${search || ''}${hash || ''}`;
  if (pathname === '/agent-app' || pathname === '/jbcash-agent') {
    return `${JB_CASH_SHOP_ORIGIN}/agent-app${suffix}`;
  }
  if (pathname.startsWith('/agent/')) {
    return `${JB_CASH_SHOP_ORIGIN}${pathname}${suffix}`;
  }
  return null;
}

async function cleanupMainSiteServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => {
          const scriptUrl = registration.active?.scriptURL
            || registration.installing?.scriptURL
            || registration.waiting?.scriptURL
            || '';
          return scriptUrl.includes('movecash-sw.js');
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
    // ignore
  }
}

function resetMainSiteHead(pathname = '/') {
  document.title = MAIN_SITE_TITLE;

  document.querySelectorAll(
    '[data-movecash="1"], [data-agent-private="1"], [data-affiliate-private="1"], link[rel="manifest"][href*="movecash"], link[rel="apple-touch-icon"][href*="movecash"], link[rel="apple-touch-icon"][href*="jbcash"]',
  ).forEach((node) => {
    node.remove();
  });

  let favicon = document.querySelector("link[rel='icon'][data-main-site='1']");
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.setAttribute('data-main-site', '1');
    document.head.appendChild(favicon);
  }
  favicon.href = getMainSiteLogoSrc(MAIN_SITE_FAVICON);

  let robots = document.querySelector('meta[name="robots"][data-main-site="1"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    robots.setAttribute('data-main-site', '1');
    document.head.appendChild(robots);
  }
  robots.content = 'index, follow';

  const canonicalPath = pathname === '/' ? '' : pathname;
  const canonicalUrl = `${MAIN_SITE_CANONICAL}${canonicalPath}`;
  let canonical = document.querySelector('link[rel="canonical"][data-main-site="1"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.setAttribute('data-main-site', '1');
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
}

export default function DomainSeparationGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated } = useAgentAuth();
  const mainSitePreparedRef = useRef(false);

  useEffect(() => {
    const { pathname, search, hash } = location;

    if (isMainSiteHost()) {
      if (isAdminRoute(pathname)) {
        return;
      }

      const shopRedirect = getShopAgentRedirect(pathname, search, hash);
      if (shopRedirect) {
        window.location.replace(shopRedirect);
        return;
      }

      if (!mainSitePreparedRef.current) {
        try {
          sessionStorage.removeItem('jbcashApp');
          localStorage.removeItem('jbcashApp');
        } catch {
          // ignore
        }
        cleanupMainSiteServiceWorkers();
        mainSitePreparedRef.current = true;
      }

      if (isBlockedOnMainSite(pathname)) {
        navigate('/', { replace: true });
        return;
      }

      if (isMainSiteRoute(pathname) || pathname === '/') {
        resetMainSiteHead(pathname);
      }
      return;
    }

    const external = getExternalRedirect(pathname, search, hash);
    if (external) {
      window.location.replace(external);
      return;
    }

    if (isAgentLandingRoute(pathname) || isMoveCashDownloadPath(pathname)) {
      return;
    }

    if (isAffiliateSiteHost() || isAffiliateRoute(pathname)) {
      return;
    }

    if (isPrivateAgentRoute(pathname)) {
      if (!canAccessPrivateAgent(search)) {
        navigate(getMainSiteFallbackPath(), { replace: true });
        return;
      }
      markJBCashAppSession();
      return;
    }

    if (isAgentLandingSiteHost() && isStandaloneDisplayMode()) {
      markJBCashAppSession();
      navigate(
        authenticated ? '/agent/dashboard' : '/agent/login?from=movecash',
        { replace: true },
      );
      return;
    }

    if (!isStandaloneDisplayMode()) {
      return;
    }

    if (isAgentLandingSiteHost() || canAccessPrivateAgent(search)) {
      markJBCashAppSession();
      navigate(
        authenticated ? '/agent/dashboard' : '/agent/login?from=movecash',
        { replace: true },
      );
    }
  }, [location, navigate, authenticated]);

  return null;
}
