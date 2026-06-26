/**
 * Oracle Games API Version 2 — DISABLED BACKUP
 * Original client preserved for rollback. Do not import directly in production code.
 * Active integration routes through oracleGamesApiClient.js facade.
 */

export const ORACLE_GAMES_API_BASE = String(
  process.env.ORACLE_GAMES_API_BASE_URL || 'https://api.oraclegames.live',
).replace(/\/+$/, '');

export const ORACLE_GAMES_LAUNCH_URL = String(
  process.env.ORACLE_GAMES_LAUNCH_URL || 'https://crazybet99.com/getgameurl/v2',
).trim();

export const ORACLE_GAMES_ADMIN_LAUNCH_URL = ORACLE_GAMES_LAUNCH_URL;
export const ORACLE_GAMES_LIVE_LAUNCH_URL = `${ORACLE_GAMES_API_BASE}/api/games/launch`;

function trim(value) {
  return String(value ?? '').trim();
}

export function resolveOracleEnvCredentials() {
  const apiKey = trim(process.env.ORACLE_GAMES_API_KEY);
  const dstGameKey = trim(process.env.ORACLE_GAMES_DST_GAME_KEY) || apiKey;
  const secretKey = trim(process.env.ORACLE_GAMES_SECRET_KEY);
  const webhookSecret = trim(process.env.ORACLE_GAMES_WEBHOOK_SECRET) || secretKey;
  const operatorId = trim(process.env.ORACLE_GAMES_OPERATOR_ID);
  const apiMode = trim(process.env.ORACLE_GAMES_API_MODE || 'demo').toLowerCase() === 'production'
    ? 'production'
    : 'demo';

  return {
    apiKey,
    dstGameKey,
    secretKey,
    webhookSecret,
    operatorId,
    apiMode,
    apiBaseUrl: ORACLE_GAMES_API_BASE,
    launchUrl: ORACLE_GAMES_LAUNCH_URL,
    callbackUrl: trim(process.env.ORACLE_GAMES_CALLBACK_URL),
    configured: Boolean(apiKey || dstGameKey),
    apiVersion: 'v2',
  };
}

export function mergeOracleCredentials(dbSettings = {}) {
  const env = resolveOracleEnvCredentials();

  return {
    ...dbSettings,
    apiKey: env.apiKey || dbSettings.apiKey || '',
    dstGameKey: env.dstGameKey || dbSettings.apiKey || '',
    secretKey: env.secretKey || dbSettings.secretKey || '',
    webhookSecret: env.webhookSecret || dbSettings.webhookSecret || '',
    operatorId: env.operatorId || dbSettings.operatorId || '',
    apiMode: env.apiMode || dbSettings.apiMode || 'demo',
    apiBaseUrl: env.apiBaseUrl || dbSettings.apiBaseUrl || ORACLE_GAMES_API_BASE,
    launchUrl: env.launchUrl || ORACLE_GAMES_LAUNCH_URL,
    envConfigured: env.configured,
    apiVersion: 'v2',
  };
}

async function oracleFetch(url, { method = 'GET', headers = {}, body = null, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  console.log(`[Oracle V2 API Request] ${method} ${url}`);
  if (body) console.log('[Oracle V2 API Request] Body:', body);

  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text.slice(0, 1000), raw: text } : null;
    }

    console.log(`[Oracle V2 API Response] ${url} | Status: ${response.status}`);
    return { response, data };
  } catch (error) {
    console.error(`[Oracle V2 API Error] ${url} | ${error.message}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function authHeaders(apiKey, extra = {}) {
  return {
    Accept: 'application/json',
    ...extra,
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
  };
}

function launchHeaders(dstGameKey, contentType) {
  return {
    Accept: 'application/json, text/plain, */*',
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(dstGameKey ? { 'x-dstgame-key': dstGameKey } : {}),
  };
}

function extractGamesFromPayload(payload) {
  if (!payload) return [];
  const candidates = [payload, payload.games, payload.data, payload.data?.games, payload.result, payload.list, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return [];
}

function normalizeCatalogGame(raw = {}, fallbackProvider = '', fallbackGameType = 'SLOT') {
  const code = trim(raw.game_code || raw.gameCode || raw.code || raw.gameid || raw.game_id || raw.id || '');
  const name = trim(raw.name || raw.game_name || raw.gameName || raw.title || code);
  if (!code || !name) return null;

  const provider = trim(
    raw.provider_code || raw.providerCode || raw.provider?.provider_code || raw.provider || fallbackProvider || '',
  ).toUpperCase();
  const gameType = trim(raw.game_type || raw.gameType || raw.category || fallbackGameType).toUpperCase();
  const imageUrl = trim(raw.image_url || raw.imageUrl || raw.image || raw.icon || raw.thumbnail || '');

  return {
    code: String(code),
    name,
    provider,
    gameType: gameType === 'SLOTS' ? 'SLOT' : gameType,
    category: trim(raw.category || gameType || 'slot').toLowerCase(),
    imageUrl: imageUrl || null,
    isLive: ['LIVE', 'CASINO', 'TABLE'].includes(gameType),
  };
}

export async function fetchOracleProviders(credentials) {
  const creds = mergeOracleCredentials(credentials);
  if (!creds.apiKey) {
    const error = new Error('ORACLE_GAMES_API_KEY is not configured');
    error.statusCode = 400;
    throw error;
  }

  const { data } = await oracleFetch(`${ORACLE_GAMES_API_BASE}/api/providers`, {
    method: 'GET',
    headers: authHeaders(creds.apiKey),
  });

  const rows = extractGamesFromPayload(data?.providers || data?.data || data);
  const seen = new Set();

  return rows
    .map((row) => ({
      code: trim(row.providerCode || row.provider_code || row.code),
      name: trim(row.providerName || row.provider_name || row.name || row.providerCode),
      gameType: trim(row.gameType || row.game_type || 'SLOT'),
    }))
    .filter((row) => {
      if (!row.code || seen.has(row.code)) return false;
      seen.add(row.code);
      return true;
    });
}

export async function fetchOracleGamesCatalog(credentials, { providers = [], gameTypes = ['SLOT'] } = {}) {
  const creds = mergeOracleCredentials(credentials);
  if (!creds.apiKey) {
    const error = new Error('ORACLE_GAMES_API_KEY is not configured');
    error.statusCode = 400;
    throw error;
  }

  const collected = [];
  const seen = new Set();

  const ingest = (payload, fallbackProvider, fallbackGameType) => {
    extractGamesFromPayload(payload).forEach((item) => {
      const normalized = normalizeCatalogGame(item, fallbackProvider, fallbackGameType);
      if (!normalized) return;
      const key = `${normalized.provider}:${normalized.code}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(normalized);
    });
  };

  for (let page = 1; page <= 15; page += 1) {
    const { data } = await oracleFetch(`${ORACLE_GAMES_API_BASE}/api/games?limit=500&page=${page}`, {
      method: 'GET',
      headers: authHeaders(creds.apiKey),
    });
    const batch = extractGamesFromPayload(data);
    if (!batch.length) break;
    ingest(data, '', gameTypes[0] || 'SLOT');
    if (batch.length < 500) break;
  }

  const providerRows = providers.length
    ? providers.map((code) => ({ code: trim(code), name: trim(code) }))
    : await fetchOracleProviders(credentials);

  for (const provider of providerRows.slice(0, 120)) {
    const code = trim(provider.code || provider);
    if (!code) continue;

    const { data } = await oracleFetch(`${ORACLE_GAMES_API_BASE}/api/games/get-list`, {
      method: 'POST',
      headers: authHeaders(creds.apiKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ providerCode: code, operatorId: creds.operatorId || undefined }),
    });

    if (data?.success === false && !extractGamesFromPayload(data).length) continue;
    ingest(data, code, gameTypes[0] || 'SLOT');
  }

  return collected;
}

function extractLaunchUrl(data) {
  if (!data) return null;
  if (typeof data === 'string' && /^https?:\/\//i.test(data.trim())) return data.trim();
  const candidate =
    data.game_url ||
    data.gameUrl ||
    data.url ||
    data.launch_url ||
    data.launchUrl ||
    data.data?.game_url ||
    data.data?.gameUrl ||
    null;
  if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) return candidate.trim();
  return null;
}

function buildLaunchPayload(body, credentials = {}) {
  const payload = {
    username: trim(body.username),
    money: Number.parseInt(String(body.money ?? body.balance ?? 0), 10) || 0,
    provider_code: trim(body.provider_code || body.providerCode),
    game_code: body.game_code ?? body.gameCode ?? 0,
    game_type: body.game_type ?? body.gameType ?? 0,
  };
  const operatorId = trim(body.operator_id || body.operatorId);
  if (operatorId) payload.operator_id = operatorId;
  const callbackUrl = trim(body.callback_url || body.callbackUrl || credentials.callbackUrl || process.env.ORACLE_GAMES_CALLBACK_URL);
  if (callbackUrl) payload.callback_url = callbackUrl;
  return payload;
}

export async function launchOracleGame(credentials, body = {}) {
  const creds = mergeOracleCredentials(credentials);
  const payload = buildLaunchPayload(body, creds);

  if (!payload.username || !payload.provider_code) {
    const error = new Error('username and provider_code are required for game launch');
    error.statusCode = 400;
    throw error;
  }

  const attempts = [];

  if (creds.apiKey) {
    const liveResult = await oracleFetch(ORACLE_GAMES_LIVE_LAUNCH_URL, {
      method: 'POST',
      headers: authHeaders(creds.apiKey, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    attempts.push({
      target: ORACLE_GAMES_LIVE_LAUNCH_URL,
      status: liveResult.response.status,
      data: liveResult.data,
    });

    const liveGameUrl = extractLaunchUrl(liveResult.data);
    if (liveGameUrl) {
      return {
        success: true,
        gameUrl: liveGameUrl,
        request: payload,
        response: liveResult.data,
        source: ORACLE_GAMES_LIVE_LAUNCH_URL,
        attempts,
        apiVersion: 'v2',
      };
    }
  }

  const dstGameKey = creds.dstGameKey || creds.apiKey;
  if (!dstGameKey) {
    const error = new Error('ORACLE_GAMES_API_KEY or ORACLE_GAMES_DST_GAME_KEY is not configured');
    error.statusCode = 400;
    throw error;
  }

  if (creds.launchUrl) {
    const legacyResult = await oracleFetch(creds.launchUrl, {
      method: 'POST',
      headers: launchHeaders(dstGameKey, 'application/json'),
      body: JSON.stringify(payload),
    });
    attempts.push({
      target: creds.launchUrl,
      status: legacyResult.response.status,
      data: legacyResult.data,
    });

    const legacyGameUrl = extractLaunchUrl(legacyResult.data);
    if (legacyGameUrl) {
      return {
        success: true,
        gameUrl: legacyGameUrl,
        request: payload,
        response: legacyResult.data,
        source: creds.launchUrl,
        attempts,
        apiVersion: 'v2',
      };
    }

    return {
      success: false,
      gameUrl: null,
      request: payload,
      response: legacyResult.data,
      source: creds.launchUrl,
      attempts,
      message: legacyResult.data?.message || legacyResult.data?.error || 'Launch failed',
      apiVersion: 'v2',
    };
  }

  const lastAttempt = attempts[attempts.length - 1];
  return {
    success: false,
    gameUrl: null,
    request: payload,
    response: lastAttempt?.data || null,
    source: ORACLE_GAMES_LIVE_LAUNCH_URL,
    attempts,
    message: lastAttempt?.data?.message || lastAttempt?.data?.error || 'Launch failed',
    apiVersion: 'v2',
  };
}

export async function testOracleGamesConnection(credentials) {
  const creds = mergeOracleCredentials(credentials);
  if (!creds.apiKey) {
    const error = new Error('ORACLE_GAMES_API_KEY is not configured');
    error.statusCode = 400;
    throw error;
  }

  const { response, data } = await oracleFetch(`${ORACLE_GAMES_API_BASE}/api/providers`, {
    method: 'GET',
    headers: authHeaders(creds.apiKey),
  });

  const success = response.ok && data?.success !== false;
  return {
    success,
    status: response.status,
    message: success ? 'OracleGames V2 API connected' : data?.message || `HTTP ${response.status}`,
    preview: data,
    apiVersion: 'v2',
  };
}
