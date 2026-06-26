/**
 * Oracle Games API facade — routes to Version 3 (default) or Version 2 (legacy fallback).
 * V2 implementation preserved in oracleGamesApiClient.v2.js (disabled backup).
 */

import * as oracleV2 from './oracleGamesApiClient.v2.js';
import * as oracleV3 from './oracleGamesV3ApiClient.js';
import { isBlockedLaunchUrl, resolveGameUidForLaunch } from './oracleGamingApiService.js';

const { buildOracleV3LaunchUsername, isOracleV3LaunchUsername } = oracleV3;

export const ORACLE_GAMES_API_BASE = oracleV3.ORACLE_GAMES_V3_API_BASE;
export const ORACLE_GAMES_LAUNCH_URL = `${oracleV3.ORACLE_GAMES_V3_API_BASE}${oracleV3.ORACLE_GAMES_V3_LAUNCH_PATH}`;

function trim(value) {
  return String(value ?? '').trim();
}

export function getOracleApiVersion() {
  const explicit = trim(process.env.ORACLE_GAMES_API_VERSION).toLowerCase();
  if (explicit === 'v2') return 'v2';
  if (explicit === 'v3') return 'v3';
  if (
    trim(process.env.ORACLE_GAMING_ORACHAL_KEY)
    || trim(process.env.ORACLE_GAMES_V3_LAUNCH_KEY)
    || trim(process.env.ORACLE_GAMES_DST_GAME_KEY)
  ) {
    return 'v3';
  }
  return 'v2';
}

export function isOracleApiV3() {
  return getOracleApiVersion() === 'v3';
}

export function isOracleV3CatalogFallbackEnabled() {
  const value = trim(process.env.ORACLE_GAMES_V3_CATALOG_FALLBACK).toLowerCase();
  if (value === 'false' || value === '0' || value === 'no') return false;
  return true;
}

export function isOracleV3LaunchFallbackEnabled() {
  const value = trim(process.env.ORACLE_GAMES_V3_LAUNCH_FALLBACK).toLowerCase();
  if (value === 'false' || value === '0' || value === 'no') return false;
  return true;
}

export function isOracleV3GameUid(value) {
  const code = trim(value);
  return /^[a-f0-9]{32}$/i.test(code);
}

export function resolveOracleEnvCredentials() {
  if (isOracleApiV3()) {
    const v3 = oracleV3.resolveOracleV3EnvCredentials();
    const v2 = oracleV2.resolveOracleEnvCredentials();
    return {
      ...v2,
      ...v3,
      apiKey: v2.apiKey,
      dstGameKey: v3.launchKey || v2.dstGameKey,
      dataKey: v3.dataKey,
      launchKey: v3.launchKey,
      apiVersion: 'v3',
      configured: v3.configured || v2.configured,
    };
  }
  return oracleV2.resolveOracleEnvCredentials();
}

export function mergeOracleCredentials(dbSettings = {}) {
  if (isOracleApiV3()) {
    const v3 = oracleV3.mergeOracleV3Credentials(dbSettings);
    const v2 = oracleV2.mergeOracleCredentials(dbSettings);
    return {
      ...v2,
      ...v3,
      apiKey: v2.apiKey || dbSettings.apiKey || '',
      dstGameKey: v3.launchKey || v2.dstGameKey,
      launchKey: v3.launchKey || v2.dstGameKey,
      dataKey: v3.dataKey || '',
      apiVersion: 'v3',
    };
  }
  return oracleV2.mergeOracleCredentials(dbSettings);
}

export async function fetchOracleProviders(credentials) {
  if (!isOracleApiV3()) {
    return oracleV2.fetchOracleProviders(credentials);
  }

  try {
    return await oracleV3.fetchOracleV3Providers(credentials);
  } catch (error) {
    if (isOracleV3CatalogFallbackEnabled() && (error.code === 'ORACLE_V3_DATA_KEY_MISSING' || error.code === 'ORACLE_V3_CATALOG_UNAUTHORIZED')) {
      console.warn('[Oracle API] V3 provider list failed, falling back to V2:', error.message);
      return oracleV2.fetchOracleProviders(credentials);
    }
    throw error;
  }
}

export async function fetchOracleProviderByCode(credentials, providerCode) {
  if (!isOracleApiV3()) {
    const providers = await oracleV2.fetchOracleProviders(credentials);
    const match = providers.find((row) => row.code === String(providerCode || '').toUpperCase());
    return { provider: match || { code: providerCode, name: providerCode }, games: [] };
  }
  return oracleV3.fetchOracleV3ProviderByCode(credentials, providerCode);
}

export async function fetchOracleGamesByUid(credentials, gameUids) {
  if (!isOracleApiV3()) {
    const error = new Error('fetchOracleGamesByUid is only available on Oracle API v3');
    error.statusCode = 400;
    throw error;
  }
  return oracleV3.fetchOracleV3Games(credentials, gameUids);
}

export async function fetchOracleGamesCatalog(credentials, options = {}) {
  if (!isOracleApiV3()) {
    return oracleV2.fetchOracleGamesCatalog(credentials, options);
  }

  try {
    return await oracleV3.fetchOracleV3GamesCatalog(credentials, options);
  } catch (error) {
    if (isOracleV3CatalogFallbackEnabled() && (error.code === 'ORACLE_V3_DATA_KEY_MISSING' || error.code === 'ORACLE_V3_CATALOG_UNAUTHORIZED')) {
      console.warn('[Oracle API] V3 games catalog failed, falling back to V2:', error.message);
      return oracleV2.fetchOracleGamesCatalog(credentials, options);
    }
    throw error;
  }
}

export async function launchOracleGame(credentials, body = {}) {
  let gameUid = trim(body.game_uid || body.gameUid || body.game_code || body.gameCode);
  const gameName = trim(body.game_name || body.gameName || body.name);

  if (isOracleApiV3() && !isOracleV3GameUid(gameUid)) {
    const providerCode = trim(body.provider_code || body.providerCode);
    try {
      const resolved = await resolveGameUidForLaunch(credentials, {
        providerCode,
        gameCode: gameUid,
        gameName,
      });
      if (resolved && isOracleV3GameUid(resolved)) {
        console.log('[Oracle API] Resolved legacy game via V3 catalog:', gameUid, '->', resolved);
        gameUid = resolved;
      }
    } catch (error) {
      console.warn('[Oracle API] V3 game uid lookup failed:', error.message);
    }
  }

  const shouldUseV3 = isOracleApiV3() && isOracleV3GameUid(gameUid);

  if (!shouldUseV3) {
    if (isOracleApiV3()) {
      const v2Result = await oracleV2.launchOracleGame(credentials, body);
      if (v2Result.success && v2Result.gameUrl && !isBlockedLaunchUrl(v2Result.gameUrl)) {
        return { ...v2Result, launchFallback: 'v2-live' };
      }
      return {
        success: false,
        gameUrl: null,
        message: 'Game is temporarily unavailable. Please try again in a moment.',
        apiVersion: 'v3',
      };
    }
    return oracleV2.launchOracleGame(credentials, body);
  }

  const username = trim(body.username);
  const v3Body = {
    username,
    game_uid: gameUid,
    amount: String(Math.max(0, Math.floor(Number(body.money ?? body.amount ?? body.balance ?? 0)))),
    money: body.money ?? body.amount ?? body.balance,
  };

  const v3Result = await oracleV3.launchOracleV3Game(credentials, v3Body);
  if (v3Result.success && v3Result.gameUrl && !isBlockedLaunchUrl(v3Result.gameUrl)) {
    return v3Result;
  }

  if (v3Result.gameUrl && isBlockedLaunchUrl(v3Result.gameUrl)) {
    v3Result.success = false;
    v3Result.gameUrl = null;
    v3Result.message = 'Game launcher is temporarily unavailable. Please try again.';
  }

  if (!v3Result.success && isOracleV3LaunchFallbackEnabled()) {
    const v2Result = await oracleV2.launchOracleGame(credentials, body);
    if (v2Result.success && v2Result.gameUrl && !isBlockedLaunchUrl(v2Result.gameUrl)) {
      return { ...v2Result, launchFallback: 'v2-live', v3Attempt: { message: v3Result.message } };
    }
  }

  return v3Result.success ? v3Result : {
    ...v3Result,
    message: v3Result.message || 'Game is temporarily unavailable. Please try again.',
  };
}

export async function testOracleGamesConnection(credentials) {
  if (!isOracleApiV3()) {
    return oracleV2.testOracleGamesConnection(credentials);
  }

  const launchTest = await oracleV3.testOracleV3Connection(credentials);

  if (oracleV3.mergeOracleV3Credentials(credentials).dataKey) {
    try {
      const providers = await oracleV3.fetchOracleV3Providers(credentials);
      return {
        ...launchTest,
        success: launchTest.success || providers.length > 0,
        message: providers.length
          ? `Oracle V3 connected (${providers.length} providers)`
          : launchTest.message,
        providerCount: providers.length,
        preview: { ...launchTest.preview, providerCount: providers.length },
      };
    } catch (error) {
      if (!isOracleV3CatalogFallbackEnabled()) {
        return {
          ...launchTest,
          catalogWarning: error.message,
        };
      }
    }
  }

  return launchTest;
}

export { buildOracleV3LaunchUsername, isOracleV3LaunchUsername };

export default {
  ORACLE_GAMES_API_BASE,
  ORACLE_GAMES_LAUNCH_URL,
  getOracleApiVersion,
  isOracleApiV3,
  isOracleV3GameUid,
  isOracleV3LaunchFallbackEnabled,
  resolveOracleEnvCredentials,
  mergeOracleCredentials,
  fetchOracleProviders,
  fetchOracleProviderByCode,
  fetchOracleGamesByUid,
  fetchOracleGamesCatalog,
  launchOracleGame,
  testOracleGamesConnection,
  buildOracleV3LaunchUsername,
  isOracleV3LaunchUsername,
};
