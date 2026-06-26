import { Navigate, Outlet } from 'react-router-dom';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';

export default function ProtectedAffiliateRoute() {
  const { authenticated } = useAffiliateAuth();

  if (!authenticated) {
    return <Navigate to="/affiliate/login" replace />;
  }

  return <Outlet />;
}
