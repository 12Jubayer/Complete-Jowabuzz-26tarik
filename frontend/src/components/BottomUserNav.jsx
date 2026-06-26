import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { launchOracleGame } from '../services/gameWalletService';

const LUCKY_SPORTS_GAME = {
  gameId: 19511,
  providerId: 3312,
  gameCode: '92b24e4c25107367a80e0fe1a97c24e4',
};

const NAV_GREEN = '#00c853';
const NAV_ICON_DARK = '#071426';

function NavIcon({ children, iconClassName = '' }) {
  return (
    <span
      className={`jb-bottom-user-nav__icon${iconClassName ? ` ${iconClassName}` : ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none">
        {children}
      </svg>
    </span>
  );
}

function DepositFabIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V9M12 16L9 13M12 16L15 13"
        stroke={NAV_ICON_DARK}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 7H17" stroke={NAV_ICON_DARK} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const navItems = [
  {
    id: 'menu',
    label: 'Menu',
    icon: (
      <NavIcon>
        <path d="M4 7H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 17H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
      </NavIcon>
    ),
  },
  {
    id: 'cricket',
    label: 'Cricket',
    icon: (
      <NavIcon>
        <path d="M5 19L15 5" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M11 7L13 5" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <circle cx="17.5" cy="17.5" r="3" stroke={NAV_GREEN} strokeWidth="2" />
        <path d="M16 16L19 19" stroke={NAV_GREEN} strokeWidth="1.5" strokeLinecap="round" />
      </NavIcon>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <NavIcon>
        <circle cx="12" cy="8.5" r="4" stroke={NAV_GREEN} strokeWidth="2" />
        <path
          d="M5.5 20C5.5 16.4101 8.41015 13.5 12 13.5C15.5899 13.5 18.5 16.4101 18.5 20"
          stroke={NAV_GREEN}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </NavIcon>
    ),
  },
  {
    id: 'deposit',
    label: 'Deposit',
    isFab: true,
  },
  {
    id: 'promotions',
    label: 'Promotions',
    icon: (
      <NavIcon>
        <rect x="4" y="8" width="16" height="12" rx="2" stroke={NAV_GREEN} strokeWidth="2" />
        <path d="M12 8V20" stroke={NAV_GREEN} strokeWidth="2" />
        <path d="M4 12H20" stroke={NAV_GREEN} strokeWidth="2" />
        <path
          d="M8 8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8"
          stroke={NAV_GREEN}
          strokeWidth="2"
        />
      </NavIcon>
    ),
  },
];

function resolveActiveTab(pathname) {
  if (pathname.startsWith('/profile/deposit') || pathname === '/deposit') return 'deposit';
  if (pathname.startsWith('/promotions')) return 'promotions';
  return null;
}

export default function BottomUserNav({ onMenuClick, onDepositClick, onProfileClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { loggedIn } = useAuth();
  const activeTab = useMemo(() => resolveActiveTab(location.pathname), [location.pathname]);

  const handleNavClick = (item) => {
    if (item.id === 'menu') {
      onMenuClick?.();
      return;
    }

    if (item.id === 'cricket') {
      if (!loggedIn) {
        navigate('/auth?tab=login');
        return;
      }
      launchOracleGame(LUCKY_SPORTS_GAME).catch(() => {
        navigate('/', { state: { category: 'sports', gameTitle: 'Lucky Sports' } });
      });
      return;
    }

    if (item.id === 'deposit') {
      if (onDepositClick) {
        onDepositClick();
      } else {
        navigate('/profile/deposit');
      }
      return;
    }

    if (item.id === 'profile') {
      if (onProfileClick) {
        onProfileClick();
      } else {
        navigate('/', { replace: true, state: { category: 'hot' } });
      }
      return;
    }

    if (item.id === 'promotions') {
      navigate('/promotions');
    }
  };

  return (
    <nav className="jb-bottom-user-nav lg:hidden" aria-label="Main navigation">
      <div className="jb-bottom-user-nav__bar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          if (item.isFab) {
            return (
              <div key={item.id} className="jb-bottom-user-nav__fab-slot">
                <button
                  type="button"
                  onClick={() => handleNavClick(item)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`jb-bottom-user-nav__fab-btn${
                    isActive ? ' jb-bottom-user-nav__fab-btn--active' : ''
                  }`}
                >
                  <DepositFabIcon />
                </button>
                <span
                  className={`jb-bottom-user-nav__label${
                    isActive ? ' jb-bottom-user-nav__label--active' : ''
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              aria-current={isActive ? 'page' : undefined}
              className={`jb-bottom-user-nav__item${
                isActive ? ' jb-bottom-user-nav__item--active' : ''
              }`}
            >
              {item.icon}
              <span className="jb-bottom-user-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
