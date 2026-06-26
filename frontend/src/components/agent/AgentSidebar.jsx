import { History, LayoutGrid, LogOut, Receipt } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { JBCASH_LOGO_SRC } from '../../utils/agentAppRoutes';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/agent/dashboard', icon: LayoutGrid },
  { id: 'transactions', label: 'Transactions', path: '/agent/transactions', icon: Receipt },
  { id: 'settlements', label: 'Settlement History', path: '/agent/settlements', icon: History },
];

export default function AgentSidebar({ onLogout, onNavigate }) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <img src={JBCASH_LOGO_SRC} alt="JBCash" className="h-8 w-auto max-w-[160px] object-contain" />
      </div>

      <nav className="flex-1 px-3 py-3">
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
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'border border-emerald-400 bg-emerald-50 text-emerald-800'
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

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
