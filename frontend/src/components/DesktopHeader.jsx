import { ChevronDown, Menu } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import CountrySelector from './CountrySelector';
import DesktopProviderDropdown from './DesktopProviderDropdown';
import SiteLogo from './SiteLogo';
import { uiConfig } from '../config/uiConfig';
import { useAuth } from '../context/AuthContext';
import { useSiteBranding } from '../context/SiteBrandingContext';

const TOP_BG = '#0a1424';
const NAV_BG = '#121f33';
const SEPARATOR = 'rgba(255, 255, 255, 0.12)';

const DROPDOWN_CATEGORIES = new Set([
  'hot',
  'sports',
  'casino',
  'slots',
  'slot',
  'crash',
  'table',
  'fishing',
  'arcade',
  'lottery',
]);

function navCategoriesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const slotIds = new Set(['slot', 'slots']);
  return slotIds.has(a) && slotIds.has(b);
}

const NAV_ITEMS = [
  { id: 'hot', label: 'HOT', hasDropdown: true },
  { id: 'sports', label: 'Sports', hasDropdown: true },
  { id: 'casino', label: 'Casino', hasDropdown: true },
  { id: 'slots', label: 'Slot', hasDropdown: true },
  { id: 'crash', label: 'Crash', hasDropdown: true },
  { id: 'table', label: 'Table', hasDropdown: true },
  { id: 'fishing', label: 'Fishing', hasDropdown: true },
  { id: 'arcade', label: 'Arcade', hasDropdown: true },
  { id: 'lottery', label: 'Lottery', hasDropdown: true },
  { id: 'promotions', label: 'Promotions', hasDropdown: false, route: '/promotions' },
  { id: 'vip', label: 'VIP', hasDropdown: false, route: '/vip' },
];

function NavItem({ item, isActive, isOpen, onHover, onSelect, onNavigate }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    event.preventDefault();

    if (item.route) {
      navigate(item.route);
      onNavigate?.();
      return;
    }

    if (item.hasDropdown) {
      onSelect?.(item.id);
    }
  };

  const handleMouseEnter = () => {
    if (item.hasDropdown) {
      onHover?.(item.id);
    }
  };

  const stateClass = isActive ? 'desktop-nav-item--active' : '';

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={`desktop-nav-item group ${stateClass}`}
      aria-expanded={item.hasDropdown ? isOpen : undefined}
      aria-haspopup={item.hasDropdown ? 'true' : undefined}
    >
      <span className="desktop-nav-item__label">{item.label}</span>
      {item.hasDropdown ? (
        <ChevronDown
          size={12}
          className={`desktop-nav-item__chevron ${isOpen ? 'desktop-nav-item__chevron--open' : ''}`}
        />
      ) : null}
      <span className="desktop-nav-item__underline" aria-hidden="true" />
    </button>
  );
}

function NavRouteItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.route}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `desktop-nav-item group ${isActive ? 'desktop-nav-item--active' : ''}`
      }
    >
      <span className="desktop-nav-item__label">{item.label}</span>
      <span className="desktop-nav-item__underline" aria-hidden="true" />
    </NavLink>
  );
}

export default function DesktopHeader({
  onProfileClick,
  onMenuClick,
  onCategorySelect,
  onProviderSelect,
  activeCategory = null,
}) {
  const navigate = useNavigate();
  const { loggedIn, user, refreshBalance } = useAuth();
  const { currencySymbol } = useSiteBranding();
  const balance = Number(user?.balance ?? 0).toFixed(2);
  const headerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [openCategory, setOpenCategory] = useState(null);
  const [hoverNavId, setHoverNavId] = useState(null);
  const [clickedNavId, setClickedNavId] = useState(activeCategory);

  useEffect(() => {
    if (activeCategory) {
      setClickedNavId(activeCategory);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (loggedIn) refreshBalance();
  }, [loggedIn, refreshBalance]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeDropdown = useCallback(() => {
    clearCloseTimer();
    setOpenCategory(null);
    setHoverNavId(null);
  }, [clearCloseTimer]);

  const handleNavHover = useCallback(
    (categoryId) => {
      if (!DROPDOWN_CATEGORIES.has(categoryId)) return;
      clearCloseTimer();
      setHoverNavId(categoryId);
      setOpenCategory(categoryId);
    },
    [clearCloseTimer],
  );

  const handleNavSelect = useCallback(
    (categoryId) => {
      if (!DROPDOWN_CATEGORIES.has(categoryId)) return;
      clearCloseTimer();
      setClickedNavId(categoryId);
      setHoverNavId(null);
      setOpenCategory(categoryId);
      onCategorySelect?.(categoryId);
    },
    [clearCloseTimer, onCategorySelect],
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenCategory(null);
      setHoverNavId(null);
    }, 220);
  }, [clearCloseTimer]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeDropdown();
    };

    const handlePointerDown = (event) => {
      if (!openCategory) return;
      if (!headerRef.current?.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handlePointerDown);
      clearCloseTimer();
    };
  }, [openCategory, closeDropdown, clearCloseTimer]);

  const handleProviderPick = (payload) => {
    onProviderSelect?.(payload);
    closeDropdown();
  };

  const headerHeight =
    uiConfig.desktopHeaderTopHeight + uiConfig.desktopHeaderNavHeight;

  const highlightedCategory = hoverNavId ?? clickedNavId ?? activeCategory;

  return (
    <>
      {openCategory ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[9998] bg-black/55 backdrop-blur-[2px] transition-opacity duration-300"
          style={{ top: headerHeight }}
          onClick={closeDropdown}
          aria-hidden="true"
        />
      ) : null}

      <header
        ref={headerRef}
        className="jb-desktop-header sticky top-0 z-[9999] hidden w-full lg:block"
        onMouseLeave={scheduleClose}
        onMouseEnter={clearCloseTimer}
      >
        <div
          className="border-b"
          style={{
            backgroundColor: TOP_BG,
            borderColor: SEPARATOR,
            height: uiConfig.desktopHeaderTopHeight,
          }}
        >
          <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={onMenuClick}
                aria-label="Open menu"
                className="jb-header-menu-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-all duration-300 hover:bg-white/5 hover:shadow-[0_0_16px_rgba(34,197,94,0.25)]"
              >
                <Menu size={22} strokeWidth={2.2} />
              </button>

              <SiteLogo variant="desktop" />
            </div>

            <div className="flex items-center gap-3">
              {loggedIn ? (
                <div
                  className="rounded-md border px-3 py-2 text-sm font-bold"
                  style={{
                    borderColor: SEPARATOR,
                    color: '#22c55e',
                    backgroundColor: '#111827',
                  }}
                >
                  {currencySymbol}{balance}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/profile/deposit')}
                className="jb-btn-neon-green rounded-md px-4 py-2 text-sm font-semibold transition-all duration-300"
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="jb-btn-neon-green rounded-md px-4 py-2 text-sm font-bold transition-all duration-300"
              >
                Profile
              </button>
              {!loggedIn ? (
                <>
                  <Link
                    to="/auth?tab=signup"
                    className="rounded-md px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110"
                    style={{
                      background: 'linear-gradient(180deg, #2a4568 0%, #1a3050 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    Sign up
                  </Link>
                  <Link
                    to="/auth?tab=login"
                    className="rounded-md px-5 py-2 text-sm font-bold text-[#1a1408] transition-all duration-300 hover:brightness-110"
                    style={{
                      background: 'linear-gradient(180deg, #f5d76e 0%, #c9a227 55%, #a88419 100%)',
                      boxShadow: '0 2px 8px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    Login
                  </Link>
                </>
              ) : null}

              <CountrySelector />
            </div>
          </div>
        </div>

        <div className="relative">
          <nav
            className="desktop-casino-nav border-b"
            style={{
              backgroundColor: NAV_BG,
              borderColor: SEPARATOR,
              height: uiConfig.desktopHeaderNavHeight,
            }}
          >
            <div className="mx-auto flex h-full max-w-[1400px] items-stretch justify-center px-2 sm:px-4">
              {NAV_ITEMS.map((item) =>
                item.route ? (
                  <NavRouteItem key={item.id} item={item} onNavigate={closeDropdown} />
                ) : (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={navCategoriesMatch(highlightedCategory, item.id)}
                    isOpen={openCategory === item.id}
                    onHover={handleNavHover}
                    onSelect={handleNavSelect}
                    onNavigate={closeDropdown}
                  />
                ),
              )}
            </div>
          </nav>

          {openCategory ? (
            <DesktopProviderDropdown
              category={openCategory}
              onProviderSelect={handleProviderPick}
              onClose={closeDropdown}
            />
          ) : null}
        </div>
      </header>
    </>
  );
}
