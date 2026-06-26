import { Navigate, Outlet } from 'react-router-dom';
import { useAgentAuth } from '../../context/AgentAuthContext';
import {
  canAccessPrivateAgent,
  getMainSiteFallbackPath,
} from '../../utils/agentAppRoutes';

export default function ProtectedAgentRoute() {
  const { authenticated } = useAgentAuth();

  if (!canAccessPrivateAgent()) {
    return <Navigate to={getMainSiteFallbackPath()} replace />;
  }

  if (!authenticated) {
    return <Navigate to="/agent/login" replace />;
  }

  return <Outlet />;
}
