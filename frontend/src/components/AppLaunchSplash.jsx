import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  detectAppLaunchMode,
  getLaunchSplashDuration,
  getSplashBranding,
  isBlockedLaunchPathOnMainSite,
  markLaunchSplashSeen,
  shouldShowLaunchSplash,
} from '../utils/appLaunch';
import { isMainSiteHost, isStandaloneDisplayMode } from '../utils/siteContext';

function LaunchSplashScreen({ mode }) {
  const branding = getSplashBranding(mode);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: branding.background }}
      role="status"
      aria-live="polite"
      aria-label={`${branding.title} loading`}
    >
      <img
        src={branding.logoSrc}
        alt={branding.title}
        className="h-24 w-auto max-w-[80vw] object-contain"
        draggable={false}
      />
      <p className="mt-5 text-sm font-semibold tracking-wide text-white/90">{branding.title}</p>
    </div>
  );
}

export default function AppLaunchSplash({ children }) {
  const location = useLocation();
  const [splashMode, setSplashMode] = useState(null);

  useEffect(() => {
    const { pathname, search } = location;

    if (isMainSiteHost() && isBlockedLaunchPathOnMainSite(pathname)) {
      const shopUrl = pathname === '/agent-app' || pathname === '/jbcash-agent'
        ? `https://jowabuzz.shop/agent-app${search || '?from=movecash'}`
        : pathname.startsWith('/agent/')
          ? `https://jowabuzz.shop${pathname}${search}`
          : null;

      if (shopUrl) {
        window.location.replace(shopUrl);
      }
      return undefined;
    }

    if (!isStandaloneDisplayMode()) {
      setSplashMode(null);
      return undefined;
    }

    const mode = detectAppLaunchMode(pathname, search);
    if (!shouldShowLaunchSplash(mode)) {
      setSplashMode(null);
      return undefined;
    }

    setSplashMode(mode);
    const duration = getLaunchSplashDuration(mode);
    const timer = window.setTimeout(() => {
      markLaunchSplashSeen(mode);
      setSplashMode(null);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return (
    <>
      {splashMode ? <LaunchSplashScreen mode={splashMode} /> : null}
      {children}
    </>
  );
}
