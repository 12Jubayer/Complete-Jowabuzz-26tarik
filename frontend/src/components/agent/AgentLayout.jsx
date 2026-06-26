import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAgentAuth } from '../../context/AgentAuthContext';
import AgentSidebar from './AgentSidebar';
import { registerMoveCashServiceWorker } from '../../services/movecashService';
import { markJBCashAppSession } from '../../utils/agentAppRoutes';

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

export default function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAgentAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobileSidebar();
  const isDashboard = location.pathname === '/agent/dashboard';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    markJBCashAppSession();
    document.title = 'JBCash';
    let robots = document.querySelector('meta[name="robots"][data-agent-private="1"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      robots.setAttribute('data-agent-private', '1');
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';

    let manifest = document.querySelector('link[rel="manifest"][data-movecash="1"]');
    if (!manifest) {
      manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/movecash-manifest.webmanifest';
      manifest.setAttribute('data-movecash', '1');
      document.head.appendChild(manifest);
    }
    let theme = document.querySelector('meta[name="theme-color"][data-movecash="1"]');
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#059669';
      theme.setAttribute('data-movecash', '1');
      document.head.appendChild(theme);
    }
    let mobileCapable = document.querySelector('meta[name="mobile-web-app-capable"][data-movecash="1"]');
    if (!mobileCapable) {
      mobileCapable = document.createElement('meta');
      mobileCapable.name = 'mobile-web-app-capable';
      mobileCapable.content = 'yes';
      mobileCapable.setAttribute('data-movecash', '1');
      document.head.appendChild(mobileCapable);
    }
    const appleTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'JBCash' },
    ];
    appleTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"][data-movecash="1"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        tag.content = content;
        tag.setAttribute('data-movecash', '1');
        document.head.appendChild(tag);
      }
    });
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"][data-movecash="1"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = '/movecash/icon-192.png';
      appleIcon.setAttribute('data-movecash', '1');
      document.head.appendChild(appleIcon);
    }
    registerMoveCashServiceWorker();
    const prevBodyBg = document.body.style.backgroundColor;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.backgroundColor = '#F8F9FA';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/agent/login', { replace: true });
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
        <AgentSidebar
          onLogout={handleLogout}
          onNavigate={isMobile ? () => setMobileOpen(false) : undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA]">
        {!(isMobile && isDashboard) && (
          <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-3 py-1.5 md:px-6 md:py-3">
            <div className="flex items-center gap-2">
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
            </div>
          </header>
        )}

        <main
          className={[
            'flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F8F9FA] px-2 md:p-6',
            isMobile && isDashboard ? 'py-0.5' : 'py-1',
          ].join(' ')}
        >
          <Outlet context={{ isMobile, openMobileMenu: () => setMobileOpen(true) }} />
        </main>
      </div>
    </div>
  );
}
