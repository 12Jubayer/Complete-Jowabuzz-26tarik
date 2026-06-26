import { Link, useNavigate } from 'react-router-dom';

import SiteLogo from './SiteLogo';
import { uiConfig } from '../config/uiConfig';

import { useAuth } from '../context/AuthContext';

import { useSiteBranding } from '../context/SiteBrandingContext';

import { mobileTextCategories } from '../data/mobileCategories';



const TOP_BG = '#0a1424';

const NAV_BG = '#121f33';

const SEPARATOR = 'rgba(255, 255, 255, 0.12)';



function isCategoryActive(activeCategory, categoryId) {

  if (activeCategory === categoryId) return true;

  if (categoryId === 'slot' && activeCategory === 'slots') return true;

  if (categoryId === 'slots' && activeCategory === 'slot') return true;

  return false;

}



export default function MobileCompactNav({

  activeCategory = null,

  onCategorySelect,

  visible = false,

}) {

  const navigate = useNavigate();

  const { loggedIn, user } = useAuth();

  const { currencySymbol } = useSiteBranding();

  const balance = Number(user?.balance ?? 0).toFixed(2);

  const mobile = uiConfig.mobile;



  const handleSelect = (categoryId) => {

    onCategorySelect?.(categoryId);

  };



  return (

    <header

      className={`jb-mobile-compact-nav fixed inset-x-0 top-0 z-50 w-full transition-all duration-300 lg:hidden ${

        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'

      }`}

      aria-hidden={!visible}

    >

      <div

        className="border-b"

        style={{

          backgroundColor: TOP_BG,

          borderColor: SEPARATOR,

          height: mobile.headerHeight,

        }}

      >

        <div className="flex h-full items-center justify-between gap-2 px-3">

          <SiteLogo variant="compact" />



          <div className="flex min-w-0 items-center justify-end gap-2">
            {loggedIn ? (
              <div
                className="rounded-md border px-2.5 py-1.5 text-sm font-bold tabular-nums"
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
              className="jb-btn-neon-green shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-300"
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="jb-btn-neon-green shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-300"
            >
              Profile
            </button>
            {!loggedIn ? (
              <>
                <Link
                  to="/auth?tab=signup"
                  className="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(180deg, #2a4568 0%, #1a3050 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  Sign up
                </Link>
                <Link
                  to="/auth?tab=login"
                  className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold text-[#1a1408] transition-all duration-300 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(180deg, #f5d76e 0%, #c9a227 55%, #a88419 100%)',
                    boxShadow: '0 2px 8px rgba(212, 175, 55, 0.35)',
                  }}
                >
                  Login
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <nav

        className="desktop-casino-nav jb-mobile-compact-nav__nav border-b"

        style={{

          backgroundColor: NAV_BG,

          borderColor: SEPARATOR,

          height: uiConfig.desktopHeaderNavHeight,

        }}

      >

        <div className="hide-scrollbar flex h-full overflow-x-auto">

          {mobileTextCategories.map((category) => {

            const isActive = isCategoryActive(activeCategory, category.id);



            return (

              <button

                key={category.id}

                type="button"

                onClick={() => handleSelect(category.id)}

                className={`desktop-nav-item shrink-0 ${isActive ? 'desktop-nav-item--active' : ''}`}

              >

                <span className="desktop-nav-item__label">{category.label}</span>

                <span className="desktop-nav-item__underline" aria-hidden="true" />

              </button>

            );

          })}

        </div>

      </nav>

    </header>

  );

}


