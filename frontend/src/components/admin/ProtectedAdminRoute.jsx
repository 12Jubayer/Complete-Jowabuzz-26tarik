import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

function AdminRouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

export default function ProtectedAdminRoute() {
  const { authenticated, bootstrapped } = useAdminAuth();

  if (!bootstrapped) {
    return <AdminRouteLoader />;
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
