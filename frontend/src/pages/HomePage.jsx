import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AboutSection from '../components/AboutSection';
import BackToTop from '../components/BackToTop';
import BottomAuthBar from '../components/BottomAuthBar';
import BottomUserNav from '../components/BottomUserNav';
import CategoryScroller from '../components/CategoryScroller';
import MobileCompactNav from '../components/MobileCompactNav';
import useMobileGameNavMode from '../hooks/useMobileGameNavMode';
import { mobileIconCategories } from '../data/mobileCategories';
import FavouriteSection from '../components/FavouriteSection';
import FeaturedGamesSection from '../components/FeaturedGamesSection';
import Footer from '../components/Footer';
import GameCategoryNavigator from '../components/GameCategoryNavigator';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import NoticeBar from '../components/NoticeBar';
import MobileMenuDrawer from '../components/MobileMenuDrawer';
import LiveChatWidget from '../components/LiveChatWidget';
import PopupBannerModal from '../components/PopupBannerModal';
import PopularGames from '../components/PopularGames';
import ProviderStrip from '../components/ProviderStrip';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loggedIn, user, logout, refreshBalance } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNavCategory, setActiveNavCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedGameTitle, setSelectedGameTitle] = useState(null);
  const gameGridRef = useRef(null);
  const mobileNavMode = useMobileGameNavMode(gameGridRef);
  const iconCategoryIds = mobileIconCategories.map((category) => category.id);
  const iconActiveCategory = iconCategoryIds.includes(activeNavCategory)
    ? activeNavCategory
    : 'hot';

  useEffect(() => {
    if (loggedIn) {
      refreshBalance();
    }
  }, [loggedIn, refreshBalance]);

  useEffect(() => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isReload = navEntry?.type === 'reload';
    const hasNavState = Boolean(location.state?.category || location.state?.provider);

    if (isReload || !hasNavState) {
      setActiveNavCategory('hot');
      setSelectedCategory(null);
      setSelectedProvider(null);
      setSelectedGameTitle(null);
      return;
    }

    const category = location.state.category ?? null;
    if (category) {
      setActiveNavCategory(category);
    }
    setSelectedCategory(category);
    setSelectedProvider(location.state.provider ?? null);
    setSelectedGameTitle(null);
  }, [location.state, location.key]);

  const handleProviderSelect = ({
    category,
    provider,
    gameTitle,
    filterCategory,
    filterProvider,
  }) => {
    setActiveNavCategory(filterCategory || category);
    setSelectedCategory(filterCategory || category);
    setSelectedProvider(gameTitle ? null : (filterProvider || provider || null));
    setSelectedGameTitle(gameTitle || null);
  };

  const handleCategoryReset = () => {
    setActiveNavCategory('hot');
    setSelectedCategory(null);
    setSelectedProvider(null);
    setSelectedGameTitle(null);
  };

  const handleProviderClear = () => {
    setSelectedProvider(null);
    setSelectedGameTitle(null);
  };

  const handleCategorySelect = (category) => {
    setActiveNavCategory(category);
    setSelectedCategory(category);
    setSelectedProvider(null);
    setSelectedGameTitle(null);
  };

  const handleDesktopProviderSelect = ({
    category,
    filterCategory,
    filterProvider,
    gameTitle,
  }) => {
    setActiveNavCategory(filterCategory || category);
    setSelectedCategory(filterCategory || category);
    setSelectedProvider(gameTitle ? null : filterProvider || null);
    setSelectedGameTitle(gameTitle || null);
  };

  const mobilePaddingClass = loggedIn ? 'pb-[82px] lg:pb-0' : 'pb-[52px] lg:pb-0';

  return (
    <div className={`homepage-lobby min-h-screen ${mobilePaddingClass} lg:pb-0`}>
      <Header
        onProfileClick={() => navigate('/profile')}
        onMenuClick={() => setMenuOpen(true)}
        onCategorySelect={handleCategorySelect}
        onProviderSelect={handleDesktopProviderSelect}
        activeCategory={activeNavCategory}
        mobileNavMode={mobileNavMode}
      />

      <MobileCompactNav
        visible={mobileNavMode === 'compact'}
        activeCategory={activeNavCategory}
        onCategorySelect={handleCategorySelect}
      />

      <main className="homepage-lobby__main mx-auto w-full">
        <HeroSlider />
        <NoticeBar />
        <div className="lg:hidden" id="game-grid-section" ref={gameGridRef}>
          {mobileNavMode === 'icon' ? (
            <CategoryScroller
              variant="icon"
              activeCategory={iconActiveCategory}
              onCategorySelect={handleCategorySelect}
            />
          ) : null}
          <GameCategoryNavigator
            selectedCategory={selectedCategory || iconActiveCategory}
            selectedProvider={selectedProvider}
            selectedGameTitle={selectedGameTitle}
            onProviderSelect={handleProviderSelect}
            onProviderClear={handleProviderClear}
            onCategoryReset={handleCategoryReset}
          />
        </div>
        <div className="hidden lg:block">
          <FeaturedGamesSection />
        </div>
        <FavouriteSection />
        {(selectedCategory || selectedProvider || selectedGameTitle) && (
          <div className="hidden lg:block" id="game-grid-section-desktop">
            <GameCategoryNavigator
              selectedCategory={selectedCategory}
              selectedProvider={selectedProvider}
              selectedGameTitle={selectedGameTitle}
              onProviderSelect={handleDesktopProviderSelect}
              onProviderClear={handleProviderClear}
              onCategoryReset={handleCategoryReset}
            />
          </div>
        )}
        <PopularGames />
        <ProviderStrip />
        <AboutSection />
      </main>

      <Footer />
      <BackToTop />

      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onLogout={logout}
        onProviderSelect={handleProviderSelect}
      />

      {loggedIn ? (
        <BottomUserNav
          onMenuClick={() => setMenuOpen(true)}
          onProfileClick={() => navigate('/profile')}
          onDepositClick={() => navigate('/profile/deposit')}
        />
      ) : (
        <BottomAuthBar />
      )}

      <LiveChatWidget />
      <PopupBannerModal />
    </div>
  );
}
