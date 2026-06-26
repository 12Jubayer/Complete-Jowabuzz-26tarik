import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUpFromLine,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  Heart,
  GitBranch,
  Globe,
  HandCoins,
  Image,
  Layers,
  LayoutGrid,
  ListChecks,
  LogOut,
  Megaphone,
  MessageCircle,
  Network,
  Percent,
  Settings,
  Smartphone,
  Share2,
  SlidersHorizontal,
  User,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminSidebarMenu } from '../../data/adminSidebarMenu';
import { filterAdminSidebarMenu } from '../../utils/adminPermissions';

const iconMap = {
  LayoutGrid,
  BadgeDollarSign,
  ArrowLeftRight,
  Gift,
  Heart,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  User,
  Crown,
  Wallet,
  Network,
  SlidersHorizontal,
  Bell,
  CreditCard,
  Image,
  Share2,
  Globe,
  Megaphone,
  BarChart3,
  Clock,
  Gamepad2,
  Flame,
  Layers,
  ListChecks,
  UserCircle,
  Users,
  MessageCircle,
  Percent,
  GitBranch,
  Settings,
  Smartphone,
  Building2,
  ArrowUpDown,
  Banknote,
  LogOut,
};

function useIsMobileSidebar() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event) => setIsMobile(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

function MenuIcon({ name, className = '' }) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} size={18} strokeWidth={1.75} />;
}

function isGameSettingChildActive(pathname, search, child) {
  if (!child.gameTab) return false;
  if (pathname !== '/admin/games') return false;
  const tab = new URLSearchParams(search).get('tab') || 'hot';
  return tab === child.gameTab;
}

function getDefaultExpandedGroups(pathname, search = '') {
  return adminSidebarMenu
    .filter((item) =>
      item.children?.some(
        (child) => child.path === pathname || isGameSettingChildActive(pathname, search, child),
      ),
    )
    .map((item) => item.id);
}

function SidebarLink({ item, collapsed, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'sidebar-item group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
          collapsed ? 'justify-center px-2' : '',
          isActive
            ? 'active border border-emerald-400 bg-emerald-50 text-emerald-800'
            : 'border border-transparent text-slate-600 hover:bg-slate-50',
        ].join(' ')
      }
    >
      <MenuIcon
        name={item.icon}
        className="shrink-0 text-current opacity-90"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function SidebarGroup({
  item,
  collapsed,
  expanded,
  onToggle,
  onExpandFromCollapsed,
  pathname,
  search,
  onNavigate,
}) {
  const hasActiveChild = item.children.some(
    (child) => child.path === pathname || isGameSettingChildActive(pathname, search, child),
  );

  const handleToggle = () => {
    if (collapsed) {
      onExpandFromCollapsed?.();
      onToggle(item.id);
      return;
    }
    onToggle(item.id);
  };

  return (
    <div>
      <button
        type="button"
        title={collapsed ? item.label : undefined}
        onClick={handleToggle}
        className={[
          'sidebar-parent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors',
          collapsed ? 'justify-center px-2' : '',
          hasActiveChild
            ? 'active border border-emerald-400 bg-emerald-50 text-emerald-800'
            : 'border border-transparent text-slate-600 hover:bg-slate-50',
        ].join(' ')}
      >
        <MenuIcon name={item.icon} className="shrink-0 text-current opacity-90" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </>
        )}
      </button>

      {!collapsed && expanded && (
        <div className="ml-[22px] border-l border-slate-200 pl-3 pt-1">
          <ul className="space-y-0.5">
            {item.children.map((child) => {
              const tabActive = child.gameTab
                ? isGameSettingChildActive(pathname, search, child)
                : false;
              const linkClassName = [
                'sidebar-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-normal transition-colors',
                tabActive
                  ? 'active border border-emerald-400 bg-emerald-50 text-emerald-800'
                  : 'border border-transparent text-slate-600 hover:bg-slate-50',
              ].join(' ');

              if (child.gameTab) {
                return (
                  <li key={child.id}>
                    <Link
                      to={{ pathname: '/admin/games', search: `?tab=${child.gameTab}` }}
                      onClick={onNavigate}
                      aria-current={tabActive ? 'page' : undefined}
                      className={linkClassName}
                    >
                      <MenuIcon name={child.icon} className="shrink-0 text-current opacity-90" />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={child.id}>
                  <NavLink
                    to={child.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      [
                        'sidebar-item flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-normal transition-colors',
                        isActive
                          ? 'active border border-emerald-400 bg-emerald-50 text-emerald-800'
                          : 'border border-transparent text-slate-600 hover:bg-slate-50',
                      ].join(' ')
                    }
                  >
                    <MenuIcon name={child.icon} className="shrink-0 text-current opacity-90" />
                    <span className="truncate">{child.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onExpandFromCollapsed,
  onLogout,
  onNavigate,
  showClose,
  menuItems,
}) {
  const { pathname, search } = useLocation();
  const [expandedGroups, setExpandedGroups] = useState(() => getDefaultExpandedGroups(pathname, search));

  useEffect(() => {
    const activeParents = getDefaultExpandedGroups(pathname, search);
    if (activeParents.length) {
      setExpandedGroups((prev) => [...new Set([...prev, ...activeParents])]);
    }
  }, [pathname, search]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        {!collapsed ? (
          <h1 className="text-[17px] font-bold tracking-tight text-emerald-600">JowaBuzz Admin</h1>
        ) : (
          <span className="mx-auto text-sm font-bold text-emerald-600">JB</span>
        )}
        <div className="flex items-center gap-1">
          {showClose && (
            <button
              type="button"
              onClick={onNavigate}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0">
          {menuItems.map((item) => (
            <li key={item.id} className="border-b border-slate-100 py-1 last:border-b-0">
              {item.children ? (
                <SidebarGroup
                  item={item}
                  collapsed={collapsed}
                  expanded={expandedGroups.includes(item.id)}
                  onToggle={toggleGroup}
                  onExpandFromCollapsed={onExpandFromCollapsed}
                  pathname={pathname}
                  search={search}
                  onNavigate={onNavigate}
                />
              ) : (
                <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={[
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50',
            collapsed ? 'justify-center px-2' : '',
          ].join(' ')}
        >
          <LogOut size={18} strokeWidth={1.75} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar({
  collapsed = false,
  mobileOpen = false,
  onToggleCollapse,
  onExpandFromCollapsed,
  onMobileClose,
  onLogout,
}) {
  const isMobile = useIsMobileSidebar();
  const { admin } = useAdminAuth();
  const showMobileBackdrop = mobileOpen && isMobile;
  const menuItems = useMemo(
    () => filterAdminSidebarMenu(adminSidebarMenu, admin),
    [admin],
  );

  const handleNavigate = useMemo(
    () => (showMobileBackdrop && onMobileClose ? onMobileClose : undefined),
    [showMobileBackdrop, onMobileClose],
  );

  return (
    <>
      {showMobileBackdrop && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={[
          'admin-sidebar flex h-full shrink-0 flex-col border-r border-slate-100 bg-white transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[260px]',
          isMobile
            ? 'fixed inset-y-0 left-0 z-50'
            : 'relative z-auto',
          isMobile
            ? mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full pointer-events-none'
            : 'translate-x-0',
        ].join(' ')}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onExpandFromCollapsed={onExpandFromCollapsed}
          onLogout={onLogout}
          onNavigate={handleNavigate}
          showClose={showMobileBackdrop}
          menuItems={menuItems}
        />
      </aside>
    </>
  );
}
