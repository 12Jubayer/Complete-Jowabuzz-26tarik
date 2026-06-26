"""Deploy Cricket -> direct Lucky Sports game launch on server."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
FILE = f'{ROOT}/frontend/src/components/BottomUserNav.jsx'

NEW_CONTENT = """import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthToast from './AuthToast';
import { useAuth } from '../context/AuthContext';
import { launchOracleGame } from '../services/gameWalletService';

const NAV_GREEN = '#00c853';
const NAV_ICON_DARK = '#071426';
const LUCKY_SPORTS_GAME_ID = 19511;
const LUCKY_SPORTS_PROVIDER_ID = 3312;

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
        <path d="M4 7H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 17H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
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
  const [launchingCricket, setLaunchingCricket] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const activeTab = useMemo(() => resolveActiveTab(location.pathname), [location.pathname]);

  const showToast = (message, type = 'success') => {
    setToast(message);
    setToastType(type);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleCricketLaunch = async () => {
    if (!loggedIn) {
      navigate('/auth?tab=login');
      return;
    }
    if (launchingCricket) return;

    setLaunchingCricket(true);
    try {
      await launchOracleGame({
        gameId: LUCKY_SPORTS_GAME_ID,
        providerId: LUCKY_SPORTS_PROVIDER_ID,
      });
      showToast('Lucky Sports opened');
    } catch (error) {
      showToast(error.message || 'Unable to open Lucky Sports', 'error');
    } finally {
      setLaunchingCricket(false);
    }
  };

  const handleNavClick = (item) => {
    if (item.id === 'menu') {
      onMenuClick?.();
      return;
    }

    if (item.id === 'cricket') {
      handleCricketLaunch();
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
        navigate('/profile');
      }
      return;
    }

    if (item.id === 'promotions') {
      navigate('/promotions');
    }
  };

  return (
    <>
      <AuthToast message={toast} type={toastType} />
      <nav className="jb-bottom-user-nav lg:hidden" aria-label="Main navigation">
        <div className="jb-bottom-user-nav__bar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isCricketLoading = item.id === 'cricket' && launchingCricket;

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
                disabled={isCricketLoading}
                className={`jb-bottom-user-nav__item${
                  isActive ? ' jb-bottom-user-nav__item--active' : ''
                }${isCricketLoading ? ' opacity-60' : ''}`}
              >
                {item.icon}
                <span className="jb-bottom-user-nav__label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
"""

# Fix promotions icon - I accidentally used menu icon. Read original and fix.
# Let me fix the promotions icon in NEW_CONTENT - use original from server file

ORIGINAL_PROMOTIONS = """  {
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
  },"""

BAD_PROMOTIONS = """  {
    id: 'promotions',
    label: 'Promotions',
    icon: (
      <NavIcon>
        <path d="M4 7H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 17H20" stroke={NAV_GREEN} strokeWidth="2" strokeLinecap="round" />
      </NavIcon>
    ),
  },"""

NEW_CONTENT = NEW_CONTENT.replace(BAD_PROMOTIONS, ORIGINAL_PROMOTIONS)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(FILE, 'w') as f:
    f.write(NEW_CONTENT.encode('utf-8'))
print('WROTE BottomUserNav.jsx')

sftp.close()

print('Building frontend...')
_, o, e = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1', timeout=300000)
combined = o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
if 'built in' in combined.lower() or '✓' in combined:
    print('BUILD_OK')
else:
    print(combined[-4000:])

_, o, _ = c.exec_command(f"grep -n 'LUCKY_SPORTS_GAME_ID\\|launchOracleGame' {FILE}")
print('verify:', o.read().decode().strip())

c.close()
print('DONE')
