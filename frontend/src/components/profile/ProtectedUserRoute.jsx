import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedUserRoute() {
  const { loggedIn } = useAuth();
  const location = useLocation();

  if (!loggedIn) {
    return <Navigate to="/auth?tab=login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
