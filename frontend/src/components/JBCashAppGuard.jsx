import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAgentAuth } from '../context/AgentAuthContext';
import {
  canAccessPrivateAgent,
  isAgentLandingRoute,
  isPrivateAgentRoute,
  isStandaloneDisplayMode,
  markJBCashAppSession,
} from '../utils/agentAppRoutes';

function isMoveCashDownloadPath(pathname = '') {
  return pathname.startsWith('/movecash/download/');
}

export default function JBCashAppGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticated } = useAgentAuth();

  useEffect(() => {
    const { pathname, search } = location;

    if (isAgentLandingRoute(pathname) || isMoveCashDownloadPath(pathname)) {
      return;
    }

    if (isPrivateAgentRoute(pathname)) {
      if (!canAccessPrivateAgent(search)) {
        navigate('/agent', { replace: true });
        return;
      }

      markJBCashAppSession();
      return;
    }

    // Only lock navigation inside the installed JBCash PWA — never hijack jowabuzz.com browser visits.
    if (!isStandaloneDisplayMode()) {
      return;
    }

    navigate(
      authenticated ? '/agent/dashboard' : '/agent/login',
      { replace: true },
    );
  }, [location, navigate, authenticated]);

  return null;
}
