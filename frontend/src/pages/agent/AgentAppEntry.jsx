import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAgentAuth } from '../../context/AgentAuthContext';
import {
  canAccessPrivateAgent,
  getMainSiteFallbackPath,
  markJBCashAppSession,
} from '../../utils/agentAppRoutes';

export default function AgentAppEntry() {
  const { authenticated } = useAgentAuth();
  const location = useLocation();
  const allowed = canAccessPrivateAgent(location.search);

  useEffect(() => {
    if (allowed) {
      markJBCashAppSession();
      document.title = 'JBCash';
    }
  }, [allowed]);

  if (!allowed) {
    return <Navigate to={getMainSiteFallbackPath()} replace />;
  }

  if (authenticated) {
    return <Navigate to="/agent/dashboard" replace />;
  }

  const loginSearch = location.search.includes('from=movecash')
    ? location.search
    : '?from=movecash';

  return <Navigate to={`/agent/login${loginSearch}`} replace />;
}
