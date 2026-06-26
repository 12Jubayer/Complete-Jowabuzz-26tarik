import { History, LayoutGrid, Megaphone, Menu, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { path: '/affiliate/dashboard', label: 'Home', icon: LayoutGrid, end: true },
  { path: '/affiliate/referrals', label: 'Referrals', icon: Users },
  { path: '/affiliate/marketing', label: 'Marketing', icon: Megaphone },
  { path: '/affiliate/withdraw', label: 'Settlement', icon: History },
];

export default function AffiliateBottomNav({ onOpenMenu }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div
        className="grid grid-cols-5 gap-1 px-1"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center rounded-lg px-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-violet-700' : 'text-slate-500',
                ].join(' ')
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="mt-1 leading-none">{tab.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center rounded-lg px-1 py-2 text-[10px] font-medium text-slate-500"
          aria-label="Open menu"
        >
          <Menu size={18} strokeWidth={1.75} />
          <span className="mt-1 leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}
