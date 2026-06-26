import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteLogo from './SiteLogo';import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useSiteBranding } from '../context/SiteBrandingContext';

export default function MainHeader() {
  const { user, loggedIn, refreshBalance } = useAuth();
  const { unreadCount } = useNotifications();
  const { currencySymbol } = useSiteBranding();
  const balance = Number(user?.balance ?? 0).toFixed(2);

  useEffect(() => {
    if (loggedIn) refreshBalance();
  }, [loggedIn, refreshBalance]);

  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        backgroundColor: colors.mainBg,
        borderColor: colors.border,
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 md:px-4">
        <SiteLogo variant="main" />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="Support"
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: colors.border, color: colors.green }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12V17C20 18.1046 19.1046 19 18 19H16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8 19H6C4.89543 19 4 18.1046 4 17V12"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path d="M12 4V2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div
            className="hidden rounded-lg border px-2.5 py-1.5 text-xs font-bold sm:block"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.cardBg,
              color: colors.green,
            }}
          >
            {currencySymbol}{balance}
          </div>

          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:brightness-110"
            style={{
              background: `linear-gradient(135deg, ${colors.green} 0%, #16a34a 100%)`,
              color: colors.textWhite,
              boxShadow: '0 0 14px rgba(34, 197, 94, 0.35)',
            }}
          >
            Deposit
          </button>

          <Link
            to="/profile/inbox"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: colors.border, color: colors.textWhite }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4C8.68629 4 6 6.68629 6 10V14L4 18H20L18 14V10C18 6.68629 15.3137 4 12 4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M10 20C10.5523 21 11.4477 21 12 21C12.5523 21 13.4477 21 14 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {loggedIn && unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
