import { Menu } from 'lucide-react';
import DesktopHeader from './DesktopHeader';
import SiteLogo from './SiteLogo';
import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';
export default function Header({
  onProfileClick,
  onMenuClick,
  onCategorySelect,
  onProviderSelect,
  activeCategory,
  mobileNavMode = 'icon',
}) {
  const mobile = uiConfig.mobile;  const hideMobileHeader = mobileNavMode === 'compact';

  return (
    <>
      <header
        className={`jb-mobile-header sticky top-0 z-40 w-full border-b lg:hidden transition-all duration-300 ${
          hideMobileHeader ? 'pointer-events-none -translate-y-full opacity-0' : ''
        }`}
        style={{
          height: mobile.headerHeight,
          backgroundColor: colors.mainBg,
          borderColor: colors.border,
        }}
      >
        <div className="mx-auto flex h-full items-center justify-between gap-2 px-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="jb-header-menu-btn flex h-9 w-9 shrink-0 items-center justify-center"
            style={{ color: colors.gold }}
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>

          <SiteLogo variant="mobile" linkClassName="min-w-0 flex-1 justify-center" />

          <button
            type="button"
            aria-label="24-7 Customer Service"
            className="flex shrink-0 flex-col items-center justify-center gap-0.5"
            style={{ color: colors.green }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12C4 8.13401 7.13401 5 11 5H13C16.866 5 20 8.13401 20 12V14C20 15.1046 19.1046 16 18 16H16.5L14 19H10L7.5 16H6C4.89543 16 4 15.1046 4 14V12Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M9 11H9.01M15 11H15.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] font-semibold leading-none">24-7 CS</span>
          </button>
        </div>
      </header>

      <DesktopHeader
        onProfileClick={onProfileClick}
        onMenuClick={onMenuClick}
        onCategorySelect={onCategorySelect}
        onProviderSelect={onProviderSelect}
        activeCategory={activeCategory}
      />
    </>
  );
}
