import { lazy, Suspense } from 'react';
import { isAffiliateSiteHost, isAgentLandingSiteHost } from '../utils/siteContext';
import HomePage from '../pages/HomePage';
import RouteLoadingFallback from './RouteLoadingFallback';

const AffiliatePage = lazy(() => import('../pages/AffiliatePage'));
const AgentMarketingLandingPage = lazy(() => import('../pages/agent/AgentMarketingLandingPage'));

export default function HomeRouteEntry() {
  if (isAffiliateSiteHost()) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AffiliatePage />
      </Suspense>
    );
  }

  if (isAgentLandingSiteHost()) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AgentMarketingLandingPage />
      </Suspense>
    );
  }

  return <HomePage />;
}
