import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import { isAffiliateSiteHost } from '../../utils/siteContext';
import AffiliateBottomNav from './AffiliateBottomNav';
import AffiliateSidebar from './AffiliateSidebar';

function useIsMobileSidebar() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobile(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export default function AffiliateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { affiliate, logout } = useAffiliateAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobileSidebar();

  useEffect(() => {
    document.title = 'Affiliate Panel';
    let robots = document.querySelector('meta[name="robots"][data-affiliate-private="1"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      robots.setAttribute('data-affiliate-private', '1');
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
    let theme = document.querySelector('meta[name="theme-color"][data-affiliate="1"]');
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#7C3AED';
      theme.setAttribute('data-affiliate', '1');
      document.head.appendChild(theme);
    }
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes('viewport-fit')) {
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }

    if (isAffiliateSiteHost()) {
      let manifest = document.querySelector('link[rel="manifest"][data-affiliate="1"]');
      if (!manifest) {
        manifest = document.createElement('link');
        manifest.rel = 'manifest';
        manifest.href = '/affiliate-manifest.webmanifest';
        manifest.setAttribute('data-affiliate', '1');
        document.head.appendChild(manifest);
      }

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"][data-affiliate="1"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = '/logos/affiliate-logo.png';
        appleIcon.setAttribute('data-affiliate', '1');
        document.head.appendChild(appleIcon);
      }
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/affiliate/login', { replace: true });
  };

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-[#F8F9FA]">
      {mobileOpen && isMobile && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={[
          isMobile ? 'fixed inset-y-0 left-0 z-50 transition-transform duration-300' : 'relative',
          isMobile && !mobileOpen ? '-translate-x-full pointer-events-none' : 'translate-x-0',
        ].join(' ')}
      >
        <AffiliateSidebar
          onLogout={handleLogout}
          onNavigate={isMobile ? () => setMobileOpen(false) : undefined}
          onClose={isMobile ? () => setMobileOpen(false) : undefined}
          isMobile={isMobile}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-30 shrink-0 border-b border-slate-100 bg-white px-3 py-2.5 md:px-6 md:py-3"
          style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {affiliate?.name || 'Affiliate'}
                </p>
                <p className="truncate text-xs text-slate-500">{affiliate?.referralCode}</p>
              </div>
            </div>
            <Link
              to="/"
              className="shrink-0 text-xs font-medium text-violet-500 transition-colors hover:text-violet-600 sm:text-sm"
            >
              <span className="sm:hidden">Site</span>
              <span className="hidden sm:inline">View site →</span>
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 pb-20 md:p-6 md:pb-6">
          <Outlet />
        </main>

        {isMobile && <AffiliateBottomNav onOpenMenu={() => setMobileOpen(true)} />}
      </div>
    </div>
  );
}
