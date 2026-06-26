import { Component } from 'react';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { isAdminPathAllowed } from '../../utils/adminPermissions';
import AdminAccessDenied from './AdminAccessDenied';
import AdminSidebar from './AdminSidebar';

class AdminOutletErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">This admin page failed to load.</p>
          <p className="mt-2">{this.state.error.message || 'Unknown error'}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAdminAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const pathAllowed = isAdminPathAllowed(admin, location.pathname);

  return (
    <div className="admin-panel flex min-h-screen bg-[#F8F9FA] text-slate-900">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onExpandFromCollapsed={() => setCollapsed(false)}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <p className="truncate text-sm text-slate-600">{admin?.email || 'admin@admin.com'}</p>
            </div>
            <Link
              to="/"
              className="text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-600"
            >
              View site →
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <AdminOutletErrorBoundary>
            {pathAllowed ? <Outlet /> : <AdminAccessDenied />}
          </AdminOutletErrorBoundary>
        </main>
      </div>
    </div>
  );
}