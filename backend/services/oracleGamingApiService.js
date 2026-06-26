/**
 * Oracle Gaming API service (https://oraclegames.net)
 * Central client for provider catalog, games, launch, and connection tests.
 * Keys are loaded from environment variables only — never hardcoded.
 */

export const ORACLE_GAMING_API_BASE = String(
  process.env.ORACLE_GAMES_V3_API_BASE_URL
    || process.env.ORACLE_GAMING_API_BASE_URL
    || 'https://oraclegames.net',
).replace(/\/+$/, '');

export const ORACLE_GAMING_LAUNCH_PATH = '/api/getgameurl';

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_LAUNCH_ATTEMPTS = 2;

function trim(value) {
  return String(value ?? '').trim();
}

function normalizeLaunchBalance(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Number(Math.max(0, amount).toFixed(2));
}

function maskKey(value) {
  const str = trim(value);
  if (!str) return '';
  if (str.length <= 4) return '****';
  return `${'*'.repeat(Math.min(str.length - 4, 8))}${str.slice(-4)}`;
}

export function resolveOracleGamingCredentials(overrides = {}) {
  const orachalKey =
    trim(overrides.orachalKey)
    || trim(process.env.ORACLE_GAMING_ORACHAL_KEY)
    || trim(process.env.ORACLE_GAMES_V3_LAUNCH_KEY)
    || trim(process.env.ORACLE_GAMES_DST_GAME_KEY)
    || trim(process.env.ORACLE_GAMES_DST_KEY);

  const dataKey =
    trim(overrides.dataKey)
    || trim(process.env.ORACLE_GAMING_DATA_KEY)
    || trim(process.env.ORACLE_GAMES_V3_DATA_KEY);

  const apiMode = trim(process.env.ORACLE_GAMES_API_MODE || 'demo').toLowerCase() === 'production'
    ? 'production'
    : 'demo';

  return {
    apiBaseUrl: trim(overrides.apiBaseUrl) || ORACLE_GAMING_API_BASE,
    orachalKey,
    dataKey,
    launchKey: orachalKey,
    apiMode,
    callbackUrl: trim(process.env.ORACLE_GAMES_CALLBACK_URL),
    configured: Boolean(orachalKey),
    catalogConfigured: Boolean(dataKey),
    apiVersion: 'v3',
  };
}

export function buildOracleHeaders(credentials, extra = {}) {
  const creds = resolveOracleGamingCredentials(credentials);
  const headers = {
    Accept: 'application/json',
    ...extra,
  };

  if (creds.dataKey) {
    headers['x-oraclegamedata-key'] = creds.dataKey;
  }
  if (creds.orachalKey) {
    headers['x-orachal-key'] = creds.orachalKey;
    headers['x-oracle-key'] = creds.orachalKey;
  }

  return headers;
}

function createApiError(message, { statusCode = 502, code = 'ORACLE_API_ERROR', cause = null } = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

async function oracleRequest(url, { method = 'GET', credentials = {}, body = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = buildOracleHeaders(credentials, body ? { 'Content-Type': 'application/json' } : {});

  console.log(`[Oracle Gaming API] ${method} ${url}`);
  if (body) {
    console.log('[Oracle Gaming API] Body:', typeof body === 'string' ? body : JSON.stringify(body));
  }
  console.log('[Oracle Gaming API] Headers:', {
    'x-oraclegamedata-key': maskKey(headers['x-oraclegamedata-key']),
    'x-orachal-key': maskKey(headers['x-orachal-key']),
  });

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text.slice(0, 2000) } : null;
    }

    console.log(`[Oracle Gaming API] Response ${response.status} ${url}`);

    if (response.status === 401 || response.status === 403) {
      throw createApiError('Oracle API unauthorized — check API keys in environment', {
        statusCode: response.status,
        code: 'ORACLE_API_UNAUTHORIZED',
      });
    }

    if (response.status >= 500) {
      throw createApiError(data?.message || `Oracle API server error (${response.status})`, {
        statusCode: response.status,
        code: 'ORACLE_API_SERVER_ERROR',
      });
    }

    if (data?.success === false) {
      const message = trim(data?.message || data?.error || 'Oracle API request failed');
      if (/unauthorized/i.test(message)) {
        throw createApiError(message, { statusCode: 401, code: 'ORACLE_API_UNAUTHORIZED' });
      }
    }

    return { response, data };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createApiError('Oracle API request timed out', { statusCode: 504, code: 'ORACLE_API_TIMEOUT' });
    }
    if (error.code) throw error;
    throw createApiError(error.message || 'Oracle API request failed', { statusCode: 502, cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function extractArray(payload) {
  if (!payload) return [];
  const candidates = [
    payload,
    payload.data,
    payload.providers,
    payload.providerlist,
    payload.games,
    payload.game_list,
    payload.list,
    payload.items,
    payload.result,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
}

function normalizeProvider(raw = {}) {
  const code = trim(raw.provider_code || raw.providerCode || raw.code || raw.provider || raw.name || '');
  const name = trim(raw.provider_name || raw.providerName || raw.name || code);
  if (!code) return null;
  return {
    code: code.toUpperCase(),
    name: name || code,
    gameType: trim(raw.game_type || raw.gameType || 'SLOT'),
  };
}

function normalizeGame(raw = {}, fallbackProvider = '') {
  const gameUid = trim(raw.game_uid || raw.gameUid || raw.uid || raw.id || '');
  const legacyCode = trim(raw.game_code || raw.gameCode || raw.code || '');
  const code = gameUid || legacyCode;
  const name = trim(raw.game_name || raw.gameName || raw.name || raw.title || code);
  if (!code || !name) return null;

  const provider = trim(
    raw.provider_code || raw.providerCode || raw.provider || fallbackProvider || '',
  ).toUpperCase();
  const gameType = trim(raw.game_type || raw.gameType || raw.category || 'SLOT').toUpperCase();

  return {
    code: String(gameUid || legacyCode),
    gameUid: gameUid || (legacyCode.length >= 20 ? legacyCode : ''),
    legacyCode: legacyCode || '',
    name,
    provider,
    gameType: gameType === 'SLOTS' ? 'SLOT' : gameType,
    category: trim(raw.category || gameType || 'slot').toLowerCase(),
    imageUrl: trim(raw.image_url || raw.imageUrl || raw.image || raw.icon || raw.thumbnail || '') || null,
    isLive: ['LIVE', 'CASINO', 'TABLE'].includes(gameType),
  };
}

export function buildOracleV3LaunchUsername(userId) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let seed = Number(userId) || 1;
  let username = '';

  for (let i = 0; i < 10; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223 + i) >>> 0;
    username += alphabet[seed % 26];
  }

  return username;
}

export function isOracleV3LaunchUsername(value) {
  return /^[a-z]{10}$/.test(String(value || '').trim());
}

export function isBlockedLaunchHost(hostname = '') {
  const host = String(hostname || '').trim().toLowerCase();
  return host === 'launcher.crazybet99.com' || host.endsWith('.crazybet99.com');
}

export function isBlockedLaunchUrl(url) {
  try {
    return isBlockedLaunchHost(new URL(String(url || '').trim()).hostname);
  } catch {
    return false;
  }
}

/** Map legacy numeric game codes to Oracle V3 game_uid via provider catalog. */
export async function resolveGameUidForLaunch(credentials = {}, { providerCode, gameCode, gameName } = {}) {
  const legacyCode = trim(gameCode);
  if (!legacyCode || /^[a-f0-9]{32}$/i.test(legacyCode)) {
    return legacyCode;
  }

  const needle = legacyCode.toLowerCase();
  const nameNeedle = trim(gameName).toLowerCase();

  const pickUid = (game) => {
    if (!game) return null;
    if (game.gameUid && /^[a-f0-9]{32}$/i.test(game.gameUid)) return game.gameUid;
    if (game.code && /^[a-f0-9]{32}$/i.test(game.code)) return game.code;
    return null;
  };

  const matchesGame = (game) => {
    const code = trim(game.code).toLowerCase();
    const uid = trim(game.gameUid).toLowerCase();
    const legacy = trim(game.legacyCode).toLowerCase();
    const name = trim(game.name).toLowerCase();
    if (code === needle || uid === needle || legacy === needle) return true;
    if (nameNeedle && name === nameNeedle) return true;
    if (nameNeedle && name.includes(nameNeedle)) return true;
    return false;
  };

  const provider = trim(providerCode).toUpperCase();
  if (provider) {
    try {
      const result = await getProviderByCode(credentials, provider);
      const match = (result.games || []).find(matchesGame);
      const uid = pickUid(match);
      if (uid) return uid;
    } catch (error) {
      console.warn(`[Oracle API] provider ${provider} lookup failed:`, error.message);
    }
  }

  try {
    const providers = await getAllProviders(credentials);
    for (const row of providers.slice(0, 80)) {
      try {
        const result = await getProviderByCode(credentials, row.code);
        const match = (result.games || []).find(matchesGame);
        const uid = pickUid(match);
        if (uid) return uid;
      } catch {
        // skip provider
      }
    }
  } catch (error) {
    console.warn('[Oracle API] global game uid lookup failed:', error.message);
  }

  return null;
}

function ensureDataKey(credentials) {
  const creds = resolveOracleGamingCredentials(credentials);
  if (!creds.dataKey) {
    throw createApiError('ORACLE_GAMING_DATA_KEY is not configured', {
      statusCode: 400,
      code: 'ORACLE_DATA_KEY_MISSING',
    });
  }
  return creds;
}

function ensureLaunchKey(credentials) {
  const creds = resolveOracleGamingCredentials(credentials);
  if (!creds.orachalKey) {
    throw createApiError('ORACLE_GAMING_ORACHAL_KEY is not configured', {
      statusCode: 400,
      code: 'ORACLE_LAUNCH_KEY_MISSING',
    });
  }
  return creds;
}

/** Get All Providers — GET /api/providerlist */
export async function getAllProviders(credentials = {}) {
  const creds = ensureDataKey(credentials);
  const { data } = await oracleRequest(`${creds.apiBaseUrl}/api/providerlist`, {
    method: 'GET',
    credentials: creds,
  });

  const seen = new Set();
  return extractArray(data)
    .map((row) => normalizeProvider(row))
    .filter((row) => {
      if (!row || seen.has(row.code)) return false;
      seen.add(row.code);
      return true;
    });
}

/** Get Provider by Provider Code — GET /api/game/{providerCode} */
export async function getProviderByCode(credentials = {}, providerCode) {
  const creds = ensureDataKey(credentials);
  const code = trim(providerCode).toUpperCase();
  if (!code) {
    throw createApiError('providerCode is required', { statusCode: 400, code: 'INVALID_PROVIDER' });
  }

  const { data } = await oracleRequest(`${creds.apiBaseUrl}/api/game/${encodeURIComponent(code)}`, {
    method: 'GET',
    credentials: creds,
  });

  const games = extractArray(data)
    .map((row) => normalizeGame(row, code))
    .filter(Boolean);

  return {
    provider: { code, name: trim(data?.provider_name || data?.providerName || code) },
    games,
    raw: data,
  };
}

/** Get Games — POST /api/getgames */
export async function getGames(credentials = {}, gameUids = []) {
  const creds = ensureDataKey(credentials);
  const uids = (Array.isArray(gameUids) ? gameUids : [gameUids])
    .map((uid) => trim(uid))
    .filter(Boolean);

  if (!uids.length) {
    throw createApiError('game_uid list is required', { statusCode: 400, code: 'INVALID_GAME' });
  }

  const { data } = await oracleRequest(`${creds.apiBaseUrl}/api/getgames`, {
    method: 'POST',
    credentials: creds,
    body: { game_uid: uids },
  });

  return extractArray(data)
    .map((row) => normalizeGame(row))
    .filter(Boolean);
}

export async function getGamesCatalog(credentials = {}, { providers = [], testProviderOnly = null } = {}) {
  const creds = resolveOracleGamingCredentials(credentials);
  const collected = [];
  const seen = new Set();

  const ingestGames = (games, providerCode = '') => {
    games.forEach((game) => {
      const normalized = normalizeGame(game, providerCode);
      if (!normalized) return;
      const key = `${normalized.provider}:${normalized.code}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(normalized);
    });
  };

  if (testProviderOnly) {
    const result = await getProviderByCode(creds, testProviderOnly);
    ingestGames(result.games, result.provider.code);
    return collected;
  }

  const providerRows = providers.length
    ? providers.map((code) => ({ code: trim(code).toUpperCase() }))
    : await getAllProviders(creds);

  for (const provider of providerRows.slice(0, 120)) {
    try {
      const result = await getProviderByCode(creds, provider.code);
      ingestGames(result.games, result.provider.code);
    } catch (error) {
      console.warn(`[Oracle Gaming API] provider ${provider.code} skipped:`, error.message);
    }
  }

  return collected;
}

function extractLaunchUrl(data) {
  if (!data) return null;
  const candidate =
    data.launch_url
    || data.launchUrl
    || data.game_url
    || data.gameUrl
    || data.url
    || data.data?.launch_url
    || data.data?.url
    || null;

  if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
    return candidate.trim();
  }
  return null;
}

/** Launch/Play Game — POST /api/getgameurl */
export async function launchGame(credentials = {}, body = {}) {
  const creds = ensureLaunchKey(credentials);
  let username = trim(body.username);
  const gameUid = trim(body.game_uid || body.gameUid || body.game_code || body.gameCode);

  if (!isOracleV3LaunchUsername(username)) {
    const userId = Number(body.user_id || body.userId || body.account_id || 0);
    if (userId > 0) {
      username = buildOracleV3LaunchUsername(userId);
    }
  }

  if (!username) {
    throw createApiError('username is required for game launch', { statusCode: 400, code: 'INVALID_USER' });
  }
  if (!isOracleV3LaunchUsername(username)) {
    throw createApiError('username must be exactly 10 lowercase letters (a-z)', {
      statusCode: 400,
      code: 'INVALID_USER',
    });
  }
  if (!gameUid) {
    throw createApiError('game_uid is required for game launch', { statusCode: 400, code: 'INVALID_GAME' });
  }

  const balanceAmount = normalizeLaunchBalance(body.money ?? body.amount ?? body.balance ?? 0);
  const callbackUrl = trim(
    body.callback_url
    || body.callbackUrl
    || creds.callbackUrl
    || process.env.ORACLE_GAMES_CALLBACK_URL,
  );

  const payload = {
    amount: String(balanceAmount),
    username,
    game_uid: gameUid,
  };
  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }
  const url = `${creds.apiBaseUrl}${ORACLE_GAMING_LAUNCH_PATH}`;
  const attempts = [];

  for (let attempt = 1; attempt <= MAX_LAUNCH_ATTEMPTS; attempt += 1) {
    try {
      const { response, data } = await oracleRequest(url, {
        method: 'POST',
        credentials: creds,
        body: payload,
      });

      attempts.push({ target: url, status: response.status, attempt });

      const gameUrl = extractLaunchUrl(data);
      if (data?.success !== false && gameUrl && !isBlockedLaunchUrl(gameUrl)) {
        return {
          success: true,
          gameUrl,
          request: payload,
          response: data,
          source: url,
          attempts,
          apiVersion: 'v3',
        };
      }

      const message = isBlockedLaunchUrl(gameUrl)
        ? 'Game launcher URL is unavailable'
        : trim(data?.message || data?.error || 'Launch failed');
      const shouldRetry = attempt < MAX_LAUNCH_ATTEMPTS && (response.status >= 500 || message === 'Server Error');

      if (!shouldRetry) {
        return {
          success: false,
          gameUrl: null,
          request: payload,
          response: data,
          source: url,
          attempts,
          message,
          apiVersion: 'v3',
        };
      }
    } catch (error) {
      attempts.push({ target: url, error: error.message, attempt });
      if (attempt >= MAX_LAUNCH_ATTEMPTS) {
        return {
          success: false,
          gameUrl: null,
          request: payload,
          response: null,
          source: url,
          attempts,
          message: error.message,
          apiVersion: 'v3',
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  return {
    success: false,
    gameUrl: null,
    request: payload,
    response: null,
    source: url,
    attempts,
    message: 'Launch failed',
    apiVersion: 'v3',
  };
}

export async function testConnection(credentials = {}) {
  const creds = resolveOracleGamingCredentials(credentials);

  if (!creds.orachalKey) {
    return {
      success: false,
      status: 400,
      message: 'ORACLE_GAMING_ORACHAL_KEY is not configured',
      apiVersion: 'v3',
    };
  }

  const testUsername = 'abcdefghij';
  const testGameUid = trim(process.env.ORACLE_GAMES_V3_TEST_GAME_UID) || '4eef5090166a6889956a630321713366';

  const launch = await launchGame(creds, {
    username: testUsername,
    game_uid: testGameUid,
    amount: '1',
    money: 1,
  });

  if (launch.success) {
    return {
      success: true,
      status: 200,
      message: 'Oracle Gaming API launch connected',
      preview: { launchUrl: launch.gameUrl },
      apiVersion: 'v3',
    };
  }

  let providerCount = 0;
  if (creds.dataKey) {
    try {
      const providers = await getAllProviders(creds);
      providerCount = providers.length;
    } catch (error) {
      return {
        success: false,
        status: 502,
        message: launch.message || error.message,
        apiVersion: 'v3',
      };
    }
  }

  return {
    success: providerCount > 0,
    status: providerCount > 0 ? 200 : 502,
    message: providerCount
      ? `Oracle Gaming API connected (${providerCount} providers)`
      : (launch.message || 'Oracle Gaming API connection test failed'),
    preview: { providerCount, launch: launch.response },
    apiVersion: 'v3',
  };
}

export default {
  ORACLE_GAMING_API_BASE,
  resolveOracleGamingCredentials,
  buildOracleHeaders,
  getAllProviders,
  getProviderByCode,
  getGames,
  getGamesCatalog,
  launchGame,
  testConnection,
  buildOracleV3LaunchUsername,
  isOracleV3LaunchUsername,
  isBlockedLaunchUrl,
  resolveGameUidForLaunch,
};
