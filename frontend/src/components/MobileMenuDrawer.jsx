import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { useNavigate } from 'react-router-dom';

import AuthToast from './AuthToast';

import { colors } from '../config/theme';

import { drawerCategories, drawerMenuLinks } from '../data/menuDrawerData';

import { getProvidersByCategory } from '../services/providerService';
import { getGamesByFilter } from '../services/gameService';
import { fetchSiteGames, fetchSiteProviders } from '../services/siteGameService';
import { isProviderFirstCategory } from '../utils/categoryNavigation';
import { launchOracleGame } from '../services/gameWalletService';
import { useAuth } from '../context/AuthContext';

import LogoLoader from './LogoLoader';
import SiteLogo from './SiteLogo';
import { useSiteBranding } from '../context/SiteBrandingContext';
import { useWinnerBoard } from '../context/WinnerBoardContext';

const DRAWER_BG = '#0a1021';
const NEON_GREEN = colors.green;
const SEARCH_CATEGORY = '__search__';

function useIsDesktopDrawer() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event) => setIsDesktop(event.matches);
    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

function mapSearchGame(game) {
  const gameCode = String(game.code || game.id || '').trim();
  const gameId = Number(game.gameId) || null;
  const providerId = Number(game.providerId) || null;
  const title = game.title || game.name || 'Game';
  const providerLabel = game.provider || game.providerCode || '';

  return {
    name: providerLabel ? `${title} · ${providerLabel}` : title,
    icon: game.image || game.imageUrl,
    gameCode,
    gameId,
    providerId,
    launchGame: Boolean(gameCode || (gameId && providerId)),
  };
}

function mapDrawerGame(game) {
  const gameCode = String(game.code || game.id || '').trim();
  const gameId = Number(game.gameId) || null;
  const providerId = Number(game.providerId) || null;

  return {
    name: game.title || game.name,
    icon: game.image || game.imageUrl,
    gameCode,
    gameId,
    providerId,
    launchGame: Boolean(gameCode || (gameId && providerId)),
  };
}

function SidebarIcon({ src, alt = '' }) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className="jb-mobile-drawer__icon-img"
      width={20}
      height={20}
      loading="lazy"
      decoding="async"
    />
  );
}

function FlyoutGridItem({ item, onClick }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = item.icon || item.logo;

  return (
    <button type="button" onClick={onClick} className="jb-mobile-drawer__flyout-item">
      <div className="jb-mobile-drawer__flyout-icon">
        {!imageError && imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="jb-mobile-drawer__flyout-fallback">{item.name.slice(0, 2)}</span>
        )}
      </div>
      <span className="jb-mobile-drawer__flyout-label">{item.name}</span>
    </button>
  );
}

export default function MobileMenuDrawer({
  open,
  onClose,
  user,
  onLogout,
  onProviderSelect,
}) {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();

  const scrollRef = useRef(null);
  const flyoutScrollRef = useRef(null);
  const isDesktop = useIsDesktopDrawer();
  const { currencySymbol } = useSiteBranding();
  const { openWinnerBoard } = useWinnerBoard();

  const [activeCategory, setActiveCategory] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchProviderResults, setSearchProviderResults] = useState([]);
  const [searchGameResults, setSearchGameResults] = useState([]);
  const [selectedSearchProvider, setSelectedSearchProvider] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setActiveCategory(null);
      setProviders([]);
      setSearchQuery('');
      setSearchProviderResults([]);
      setSearchGameResults([]);
      setSelectedSearchProvider(null);
      setSearchLoading(false);
      return;
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open]);

  useEffect(() => {
    if (flyoutScrollRef.current) {
      flyoutScrollRef.current.scrollTop = 0;
    }
  }, [activeCategory, selectedSearchProvider]);

  useEffect(() => {
    if (!activeCategory || activeCategory === SEARCH_CATEGORY) {
      if (activeCategory !== SEARCH_CATEGORY) {
        setProviders([]);
        setLoadingProviders(false);
      }
      return undefined;
    }

    let active = true;
    setProviders([]);
    setLoadingProviders(true);

    const loadItems = isProviderFirstCategory(activeCategory)
      ? getProvidersByCategory(activeCategory).then((result) => result.map((provider) => ({
        name: provider.name,
        icon: provider.logo,
        filterProvider: provider.code || provider.name,
      })))
      : getGamesByFilter({ category: activeCategory }).then((games) => games.slice(0, 24).map(mapDrawerGame));

    loadItems.then((result) => {
      if (!active) return;
      setProviders(result);
      setLoadingProviders(false);
    }).catch(() => {
      if (!active) return;
      setProviders([]);
      setLoadingProviders(false);
    });

    return () => {
      active = false;
    };
  }, [activeCategory]);

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3000);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchProviderResults([]);
      setSearchGameResults([]);
      setSelectedSearchProvider(null);
      setSearchLoading(false);
      if (activeCategory === SEARCH_CATEGORY) {
        setActiveCategory(null);
      }
      return undefined;
    }

    setSearchLoading(true);
    setSearchGameResults([]);
    if (!selectedSearchProvider) {
      setSearchProviderResults([]);
    }
    setActiveCategory(SEARCH_CATEGORY);

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        if (selectedSearchProvider) {
          const gamesRes = await fetchSiteGames({
            category: 'all',
            provider: selectedSearchProvider,
            search: query,
            limit: 60,
          });
          if (!active) return;
          setSearchGameResults((gamesRes.data || []).map(mapSearchGame));
          setSearchProviderResults([]);
        } else {
          const [gamesRes, providersRes] = await Promise.all([
            fetchSiteGames({ category: 'all', search: query, limit: 40 }),
            fetchSiteProviders(),
          ]);
          if (!active) return;

          const q = query.toLowerCase();
          const providerList = (providersRes.data || [])
            .filter((provider) => {
              const name = String(provider.name || '').toLowerCase();
              const code = String(provider.code || '').toLowerCase();
              return name.includes(q) || code.includes(q);
            })
            .slice(0, 20)
            .map((provider) => ({
              name: provider.name,
              icon: provider.logo,
              filterProvider: provider.code || provider.name,
              isSearchProvider: true,
            }));

          setSearchProviderResults(providerList);
          setSearchGameResults((gamesRes.data || []).map(mapSearchGame));
        }
      } catch {
        if (!active) return;
        setSearchProviderResults([]);
        setSearchGameResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, selectedSearchProvider]);

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleFlyoutItemClick = async (item) => {
    if (item.isSearchProvider) {
      setSearchGameResults([]);
      setSearchLoading(true);
      setSelectedSearchProvider(item.filterProvider || item.name);
      return;
    }

    if (item.launchGame && (item.gameCode || (item.gameId && item.providerId))) {
      if (!loggedIn) {
        navigate('/auth?tab=login');
        onClose();
        return;
      }

      try {
        await launchOracleGame({
          gameCode: item.gameCode,
          gameId: item.gameId,
          providerId: item.providerId,
        });
        showToast(`${item.name} opened`);
      } catch (error) {
        showToast(error.message || 'Unable to open game');
      }

      onClose();
      return;
    }

    onProviderSelect?.({
      category: activeCategory === SEARCH_CATEGORY ? null : activeCategory,
      filterCategory: item.filterCategory || activeCategory,
      filterProvider: item.filterProvider || item.name,
      provider: item.gameTitle ? null : (item.filterProvider || item.name),
      gameTitle: item.gameTitle || null,
    });

    onClose();
  };

  const handleCategoryOpen = (categoryId) => {
    setSelectedSearchProvider(null);
    if (isDesktop) {
      setActiveCategory(categoryId);
      return;
    }

    setActiveCategory((current) => (current === categoryId ? null : categoryId));
  };

  const handleCategoryBrowseAll = () => {
    onProviderSelect?.({
      category: activeCategory,
      filterCategory: activeCategory,
      filterProvider: null,
      provider: null,
      gameTitle: null,
    });

    onClose();
  };

  const handleMenuLinkClick = async (link) => {
    setActiveCategory(null);

    if (link.action === 'winner-board') {
      openWinnerBoard();
      onClose();
      return;
    }

    if (link.id === 'affiliate') {
      navigate('/affiliate', { state: { sidebarLanding: true } });
      onClose();
      return;
    }

    if (link.path) {
      navigate(link.path);
      onClose();
      return;
    }

    showToast(`${link.label} coming soon`);
    onClose();
  };

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return drawerCategories;
    return drawerCategories;
  }, [normalizedSearch]);

  const filteredProviders = useMemo(() => {
    if (!normalizedSearch) return providers;
    return providers.filter((item) => item.name.toLowerCase().includes(normalizedSearch));
  }, [providers, normalizedSearch]);

  const isSearchMode = activeCategory === SEARCH_CATEGORY;
  const activeCategoryLabel = isSearchMode
    ? (selectedSearchProvider ? `${selectedSearchProvider} Games` : 'Search Results')
    : drawerCategories.find((item) => item.id === activeCategory)?.label;
  const isProviderCategory = !isSearchMode && isProviderFirstCategory(activeCategory);
  const flyoutLoading = isSearchMode ? searchLoading : loadingProviders;
  const flyoutGameItems = isSearchMode ? searchGameResults : filteredProviders;

  const drawerMotion = isDesktop
    ? { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };

  const drawerSizeClass = isDesktop
    ? activeCategory
      ? 'inset-y-0 left-0 w-[min(680px,96vw)] rounded-r-[24px]'
      : 'inset-y-0 left-0 w-[min(300px,44vw)] rounded-r-[24px]'
    : 'inset-0 rounded-none';

  const sidebarWidthClass = activeCategory
    ? 'jb-mobile-drawer__sidebar--split'
    : 'jb-mobile-drawer__sidebar--full';

  return (
    <AnimatePresence>
      {open && (
        <div className="jb-mobile-drawer-root fixed inset-0 z-[10001]">
          <AuthToast message={toastMessage} />

          <motion.button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className={[
              'jb-mobile-drawer absolute flex flex-col overflow-hidden border',
              drawerSizeClass,
            ].join(' ')}
            style={{
              backgroundColor: DRAWER_BG,
              borderColor: 'rgba(34, 197, 94, 0.25)',
            }}
            initial={drawerMotion.initial}
            animate={drawerMotion.animate}
            exit={drawerMotion.exit}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="jb-mobile-drawer__layout min-h-0 flex-1">
              <aside className={`jb-mobile-drawer__sidebar ${sidebarWidthClass}`}>
                <div ref={scrollRef} className="jb-mobile-drawer__scroll flex-1 overflow-y-auto overscroll-contain pb-4">
                  <div className="jb-mobile-drawer__header px-4 pb-2 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <SiteLogo variant="drawer" linkTo={null} />
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="jb-mobile-drawer__close-btn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    <div className="jb-mobile-drawer__profile mt-2">
                      <div className="jb-mobile-drawer__profile-avatar">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="4" fill="#1d4ed8" />
                          <path
                            d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20"
                            stroke="#1d4ed8"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: colors.textWhite }}>
                          {user?.username || 'Guest'}
                        </p>
                        <p className="text-sm font-bold" style={{ color: NEON_GREEN }}>
                          {currencySymbol} {Number(user?.balance ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="jb-mobile-drawer__search mt-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          if (!event.target.value.trim()) {
                            setSelectedSearchProvider(null);
                          }
                        }}
                        placeholder="Search Games"
                        className="jb-mobile-drawer__search-input"
                      />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M20 20L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  <div className="jb-mobile-drawer__panel mx-4 mt-2">
                    {filteredCategories.map((category) => {
                      const isActive = activeCategory === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleCategoryOpen(category.id)}
                          className={`jb-mobile-drawer__category ${
                            isActive ? 'jb-mobile-drawer__category--active' : ''
                          }`}
                        >
                          <span className="jb-mobile-drawer__category-icon">
                            <SidebarIcon src={category.icon} alt={category.label} />
                          </span>
                          <span className="jb-mobile-drawer__category-label">{category.label}</span>
                          <span className="jb-mobile-drawer__category-chevron">›</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="jb-mobile-drawer__panel mx-4 mt-3">
                    {drawerMenuLinks.map((link) => (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => handleMenuLinkClick(link)}
                        className="jb-mobile-drawer__link"
                      >
                        <span className="jb-mobile-drawer__category-icon">
                          <SidebarIcon src={link.icon} alt={link.label} />
                        </span>
                        <span className="jb-mobile-drawer__category-label">{link.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mx-4 mt-3">
                    <button type="button" onClick={handleLogout} className="jb-mobile-drawer__logout">
                      <span aria-hidden="true">🚪</span>
                      Logout
                    </button>
                  </div>
                </div>
              </aside>

              <AnimatePresence>
                {activeCategory ? (
                  <motion.aside
                    key={`${activeCategory}-${selectedSearchProvider || 'all'}`}
                    className="jb-mobile-drawer__flyout"
                    initial={{ x: isDesktop ? 24 : '100%', opacity: isDesktop ? 0.85 : 0.9 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: isDesktop ? 24 : '100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                  >
                    <div className="jb-mobile-drawer__flyout-head">
                      {isSearchMode && selectedSearchProvider ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSearchProvider(null)}
                          className="mr-2 text-sm font-semibold text-emerald-400"
                        >
                          ← Back
                        </button>
                      ) : null}
                      <p className="jb-mobile-drawer__flyout-title">{activeCategoryLabel}</p>

                      {!isDesktop ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isSearchMode) {
                              setSearchQuery('');
                              setSelectedSearchProvider(null);
                            }
                            setActiveCategory(null);
                          }}
                          className="jb-mobile-drawer__flyout-close"
                          aria-label="Close category panel"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    <div ref={flyoutScrollRef} className="jb-mobile-drawer__flyout-scroll">
                      {!isSearchMode ? (
                        <button
                          type="button"
                          onClick={handleCategoryBrowseAll}
                          className="jb-mobile-drawer__browse-all mb-3"
                        >
                          Browse all {activeCategoryLabel} {isProviderCategory ? 'providers' : 'games'}
                        </button>
                      ) : null}

                      {flyoutLoading ? (
                        <div className="jb-mobile-drawer__flyout-empty">
                          <LogoLoader size="sm" />
                        </div>
                      ) : (
                        <>
                          {isSearchMode && !selectedSearchProvider && searchProviderResults.length > 0 ? (
                            <>
                              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Providers
                              </p>
                              <div className="jb-mobile-drawer__flyout-grid mb-4">
                                {searchProviderResults.map((item) => (
                                  <FlyoutGridItem
                                    key={`search-provider-${item.filterProvider}`}
                                    item={item}
                                    onClick={() => handleFlyoutItemClick(item)}
                                  />
                                ))}
                              </div>
                              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Games
                              </p>
                            </>
                          ) : null}

                          {flyoutGameItems.length ? (
                            <div className="jb-mobile-drawer__flyout-grid">
                              {flyoutGameItems.map((item) => (
                                <FlyoutGridItem
                                  key={
                                    item.gameCode
                                      ? `game-${item.gameCode}-${item.providerId}`
                                      : `game-${item.gameId}-${item.providerId}-${item.name}`
                                  }
                                  item={item}
                                  onClick={() => handleFlyoutItemClick(item)}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="jb-mobile-drawer__flyout-empty">
                              {isSearchMode
                                ? (normalizedSearch.length < 2 ? 'Type at least 2 characters' : 'No results found')
                                : `No ${isProviderCategory ? 'providers' : 'games'} found`}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.aside>
                ) : null}
              </AnimatePresence>
            </div>

            <button
              type="button"
              aria-label="Chat support"
              className="absolute bottom-5 right-4 flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
              style={{
                backgroundColor: NEON_GREEN,
                boxShadow: '0 0 18px rgba(34, 197, 94, 0.45)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 5H20V16H8L4 20V5Z"
                  stroke="#0b0f10"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M8 10H16M8 13H13" stroke="#0b0f10" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
