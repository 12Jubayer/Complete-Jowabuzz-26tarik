import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../config/theme';
import AuthToast from '../components/AuthToast';
import BottomAuthBar from '../components/BottomAuthBar';
import BottomUserNav from '../components/BottomUserNav';
import Footer from '../components/Footer';
import MainHeader from '../components/MainHeader';
import MobileMenuDrawer from '../components/MobileMenuDrawer';
import { useAuth } from '../context/AuthContext';

export default function MobilePageLayout({ children }) {
  const navigate = useNavigate();
  const { loggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const paddingClass = loggedIn ? 'pb-[82px] lg:pb-0' : 'pb-[52px] lg:pb-0';

  const handleProviderSelect = ({ category, provider }) => {
    navigate('/', { state: { category, provider } });
  };

  return (
    <div
      className={`min-h-screen ${paddingClass}`}
      style={{ backgroundColor: colors.mainBg }}
    >
      <MainHeader />
      {children}
      <Footer />

      {loggedIn ? (
        <>
          <BottomUserNav
            onMenuClick={() => setMenuOpen(true)}
            onProfileClick={() => navigate('/profile')}
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
      ) : (
        <BottomAuthBar />
      )}
    </div>
  );
}
