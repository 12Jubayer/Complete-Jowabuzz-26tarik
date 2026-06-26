import {
  isHmkConfigured,
  isHmkProvider,
  isOracleDisabled,
  launchHmkGameSession,
  shouldUseHmkForAllGames,
} from './hmkApiService.js';
import {
  isSoftApiConfigured,
  isSoftApiProvider,
  launchSoftApiGameSession,
} from './softapiService.js';

export async function launchGameSession({ provider, user, game, sessionToken, launchBalance }) {
  const routeAllViaHmk = shouldUseHmkForAllGames();

  if (routeAllViaHmk || isHmkProvider(provider)) {
    if (!isHmkConfigured()) {
      const error = new Error('HMK API is not configured');
      error.statusCode = 503;
      throw error;
    }
    return launchHmkGameSession({ user, game, sessionToken, launchBalance });
  }

  if (isSoftApiProvider(provider)) {
    if (!isSoftApiConfigured()) {
      const error = new Error('SoftAPI is not configured');
      error.statusCode = 503;
      throw error;
    }
    return launchSoftApiGameSession({ user, game, sessionToken, launchBalance });
  }

  if (isOracleDisabled()) {
    const error = new Error('Oracle gaming API is disabled. Use HMK provider.');
    error.statusCode = 503;
    throw error;
  }

  const { launchOracleGameSession } = await import('./gamingGatewayService.js');
  return launchOracleGameSession({ user, game, sessionToken, launchBalance });
}

export async function settleGameRound({ provider, payload }) {
  if (isOracleDisabled()) {
    const error = new Error('Oracle gaming API is disabled');
    error.statusCode = 503;
    throw error;
  }

  const { isGamingGatewayActive } = await import('./gamingGatewayService.js');
  const { getProviderAdapter } = await import('../providers/providerFactory.js');

  const gatewayActive = await isGamingGatewayActive();
  if (!gatewayActive) {
    const error = new Error('Gaming gateway is disabled');
    error.statusCode = 503;
    throw error;
  }

  const adapter = getProviderAdapter(provider.adapter_key || 'demo');
  return adapter.resolveRoundResult(payload);
}

export default { launchGameSession, settleGameRound };
