import { useLocation } from 'react-router-dom';
import { findAdminMenuItemByPath } from '../../data/adminSidebarMenu';

export default function AdminPlaceholderPage() {
  const { pathname } = useLocation();
  const current = findAdminMenuItemByPath(pathname);

  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="text-center">
        {current?.label && (
          <p className="mb-2 text-sm font-medium text-slate-500">{current.label}</p>
        )}
        <h2 className="text-2xl font-semibold text-slate-800">Coming Soon</h2>
      </div>
    </div>
  );
}
