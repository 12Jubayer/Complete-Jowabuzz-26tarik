import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomUserNav from './BottomUserNav';
import MobileMenuDrawer from './MobileMenuDrawer';
import { useAuth } from '../context/AuthContext';
import { uiConfig } from '../config/uiConfig';

/**
 * Logged-in mobile bottom navigation + menu drawer.
 * Use on pages that are not wrapped by HomePage or MobilePageLayout.
 */
export default function PlayerMobileNav({ onProviderSelect }) {
  const navigate = useNavigate();
  const { user, logout, loggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loggedIn) return null;

  const handleProviderSelect = (payload) => {
    if (onProviderSelect) {
      onProviderSelect(payload);
      return;
    }
    navigate('/', { state: payload });
  };

  return (
    <>
      <BottomUserNav
        onMenuClick={() => setMenuOpen(true)}
        onProfileClick={() => navigate('/', { replace: true, state: { category: 'hot' } })}
        onDepositClick={() => navigate('/profile/deposit')}
      />
      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        onLogout={logout}
        onProviderSelect={handleProviderSelect}
      />
    </>
  );
}

export function playerMobileNavPaddingClass(loggedIn) {
  if (!loggedIn) return 'pb-[52px] lg:pb-0';
  return `pb-[${uiConfig.bottomNavHeight}px] lg:pb-0`;
}

export const PLAYER_MOBILE_NAV_PADDING = `pb-[82px] lg:pb-0`;
