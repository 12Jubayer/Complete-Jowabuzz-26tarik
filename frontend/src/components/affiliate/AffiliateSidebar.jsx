import {
  BarChart3,
  History,
  LayoutGrid,
  LogOut,
  Megaphone,
  Percent,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/affiliate/dashboard', icon: LayoutGrid },
  { id: 'referrals', label: 'My Referrals', path: '/affiliate/referrals', icon: Users },
  { id: 'commission', label: 'Commission', path: '/affiliate/commission', icon: Percent },
  { id: 'withdraw', label: 'Settlement History', path: '/affiliate/withdraw', icon: History },
  { id: 'marketing', label: 'Marketing Tools', path: '/affiliate/marketing', icon: Megaphone },
  { id: 'profile', label: 'Profile', path: '/affiliate/profile', icon: UserCircle },
];

export default function AffiliateSidebar({ onLogout, onNavigate, onClose, isMobile = false }) {
  return (
    <aside className="flex h-full w-[min(280px,85vw)] shrink-0 flex-col border-r border-slate-100 bg-white shadow-xl md:w-[250px] md:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-violet-600" />
          <h1 className="text-[17px] font-bold tracking-tight text-violet-700">Affiliate Panel</h1>
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.id === 'dashboard'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium transition-colors md:py-2.5',
                      isActive
                        ? 'border border-violet-400 bg-violet-50 text-violet-800'
                        : 'border border-transparent text-slate-600 hover:bg-slate-50',
                    ].join(' ')
                  }
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="border-t border-slate-100 p-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 md:py-2.5"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
