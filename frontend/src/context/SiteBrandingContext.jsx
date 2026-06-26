import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPublicBranding } from '../services/siteBrandingService';
import { getCurrencySymbol } from '../utils/currency';
import {
  getMainSiteLogoSrc,
  isMainSiteHost,
  MAIN_SITE_FAVICON,
  MAIN_SITE_TITLE,
} from '../utils/siteContext';

const DEFAULT_BRANDING = {
  siteName: 'JowaBuzz',
  currency: 'BDT',
  logoUrl: '/images/logo.png',
  faviconUrl: '/images/logo.png',
};

const SiteBrandingContext = createContext({
  branding: DEFAULT_BRANDING,
  loading: true,
  refreshBranding: async () => {},
  logoSrc: DEFAULT_BRANDING.logoUrl,
  faviconSrc: DEFAULT_BRANDING.faviconUrl,
  currency: DEFAULT_BRANDING.currency,
  currencySymbol: getCurrencySymbol(DEFAULT_BRANDING.currency),
  siteName: DEFAULT_BRANDING.siteName,
});

function resolveAssetUrl(url, fallback) {
  const value = String(url || '').trim();
  return value || fallback;
}

function getFaviconType(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'image/png';
}

function clearJBCashHeadTags() {
  document.querySelectorAll(
    '[data-movecash="1"], link[rel="manifest"][href*="movecash"], link[rel="apple-touch-icon"][href*="movecash"], link[rel="apple-touch-icon"][href*="jbcash"]',
  ).forEach((node) => {
    node.remove();
  });
}

function applyFavicon(url) {
  let link = document.querySelector("link[rel='icon'][data-main-site='1']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.setAttribute('data-main-site', '1');
    document.head.appendChild(link);
  }

  link.href = url;
  link.type = getFaviconType(url);
}

export function SiteBrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    try {
      const data = await fetchPublicBranding();
      setBranding({
        siteName: String(data.siteName || DEFAULT_BRANDING.siteName).trim() || DEFAULT_BRANDING.siteName,
        currency: String(data.currency || DEFAULT_BRANDING.currency).trim().replace(/\.$/, '') || DEFAULT_BRANDING.currency,
        logoUrl: resolveAssetUrl(data.logoUrl, DEFAULT_BRANDING.logoUrl),
        faviconUrl: resolveAssetUrl(data.faviconUrl, DEFAULT_BRANDING.faviconUrl),
      });
    } catch {
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshBranding();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshBranding]);

  useEffect(() => {
    if (isMainSiteHost()) {
      clearJBCashHeadTags();
      document.title = MAIN_SITE_TITLE;
      applyFavicon(getMainSiteLogoSrc(branding.faviconUrl) || MAIN_SITE_FAVICON);
      return;
    }

    document.title = `${branding.siteName} - Cricket Exchange & Casino`;
    applyFavicon(branding.faviconUrl);
  }, [branding.siteName, branding.faviconUrl, branding.logoUrl]);

  const resolvedLogoSrc = isMainSiteHost()
    ? getMainSiteLogoSrc(branding.logoUrl)
    : branding.logoUrl;

  const resolvedFaviconSrc = isMainSiteHost()
    ? getMainSiteLogoSrc(branding.faviconUrl)
    : branding.faviconUrl;

  const value = useMemo(
    () => ({
      branding,
      loading,
      refreshBranding,
      logoSrc: resolvedLogoSrc,
      faviconSrc: resolvedFaviconSrc,
      currency: branding.currency,
      currencySymbol: getCurrencySymbol(branding.currency),
      siteName: branding.siteName,
    }),
    [branding, loading, refreshBranding, resolvedLogoSrc, resolvedFaviconSrc],
  );

  return <SiteBrandingContext.Provider value={value}>{children}</SiteBrandingContext.Provider>;
}

export function useSiteBranding() {
  return useContext(SiteBrandingContext);
}

export default SiteBrandingContext;
