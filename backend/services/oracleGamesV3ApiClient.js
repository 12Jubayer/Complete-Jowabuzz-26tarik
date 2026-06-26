/**
 * Oracle Games API Version 3 client — backward-compatible wrapper.
 * Implementation lives in oracleGamingApiService.js.
 */

import * as oracleGaming from './oracleGamingApiService.js';

export const ORACLE_GAMES_V3_API_BASE = oracleGaming.ORACLE_GAMING_API_BASE;
export const ORACLE_GAMES_V3_LAUNCH_PATH = oracleGaming.ORACLE_GAMING_LAUNCH_PATH;

export function resolveOracleV3EnvCredentials() {
  const creds = oracleGaming.resolveOracleGamingCredentials();
  return {
    apiBaseUrl: creds.apiBaseUrl,
    dataKey: creds.dataKey,
    launchKey: creds.launchKey,
    apiMode: creds.apiMode,
    callbackUrl: creds.callbackUrl,
    configured: creds.configured,
    catalogConfigured: creds.catalogConfigured,
    apiVersion: 'v3',
  };
}

export function mergeOracleV3Credentials(dbSettings = {}) {
  const env = resolveOracleV3EnvCredentials();
  return {
    ...dbSettings,
    apiBaseUrl: env.apiBaseUrl || dbSettings.apiBaseUrl || ORACLE_GAMES_V3_API_BASE,
    dataKey: env.dataKey || dbSettings.dataKey || '',
    launchKey: env.launchKey || dbSettings.launchKey || dbSettings.dstGameKey || '',
    dstGameKey: env.launchKey || dbSettings.dstGameKey || '',
    apiMode: env.apiMode || dbSettings.apiMode || 'demo',
    callbackUrl: env.callbackUrl || dbSettings.callbackUrl || '',
    envConfigured: env.configured,
    catalogConfigured: env.catalogConfigured || Boolean(dbSettings.dataKey),
    apiVersion: 'v3',
  };
}

export const buildOracleV3LaunchUsername = oracleGaming.buildOracleV3LaunchUsername;
export const isOracleV3LaunchUsername = oracleGaming.isOracleV3LaunchUsername;

export async function fetchOracleV3Providers(credentials) {
  return oracleGaming.getAllProviders(credentials);
}

export async function fetchOracleV3ProviderByCode(credentials, providerCode) {
  return oracleGaming.getProviderByCode(credentials, providerCode);
}

export async function fetchOracleV3Games(credentials, gameUids) {
  return oracleGaming.getGames(credentials, gameUids);
}

export async function fetchOracleV3GamesCatalog(credentials, options = {}) {
  return oracleGaming.getGamesCatalog(credentials, options);
}

export async function launchOracleV3Game(credentials, body = {}) {
  return oracleGaming.launchGame(credentials, body);
}

export async function testOracleV3Connection(credentials) {
  return oracleGaming.testConnection(credentials);
}

export default {
  ORACLE_GAMES_V3_API_BASE,
  resolveOracleV3EnvCredentials,
  mergeOracleV3Credentials,
  fetchOracleV3Providers,
  fetchOracleV3ProviderByCode,
  fetchOracleV3Games,
  fetchOracleV3GamesCatalog,
  launchOracleV3Game,
  testOracleV3Connection,
  buildOracleV3LaunchUsername,
  isOracleV3LaunchUsername,
};
