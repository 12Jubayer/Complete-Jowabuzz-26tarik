import { Navigate, useLocation } from 'react-router-dom';
import { isAdminRoute } from '../utils/siteContext';

export default function AppFallbackRoute() {
  const { pathname } = useLocation();

  if (isAdminRoute(pathname)) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Navigate to="/" replace />;
}
