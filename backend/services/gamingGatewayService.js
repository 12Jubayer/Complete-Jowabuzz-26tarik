import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta, syncAllWalletBalances } from './gameWalletService.js';
import {
  logOracleCallbackUserMatch,
  logOracleCallbackUserNotFound,
} from '../utils/oracleCallbackRequestDebug.js';
import {
  buildOracleV3LaunchUsername,
  fetchOracleGamesCatalog,
  isOracleApiV3,
  isOracleV3GameUid,
  isOracleV3LaunchUsername,
  launchOracleGame,
  mergeOracleCredentials,
  resolveOracleEnvCredentials,
  testOracleGamesConnection,
} from './oracleGamesApiClient.js';
import {
  trackOracleBetForAffiliate,
  settleOracleBetForAffiliate,
  cancelOracleBetForAffiliate,
} from './affiliateBalanceService.js';
import { applyBonusClaimTurnover } from './bonusTurnoverService.js';
import { applyDepositBonusTurnover } from './depositBonusService.js';
import { processUserVipProgress } from './vipLevelService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXED_CALLBACK_URL = 'https://jowabuzz.com/api/oracle/callback';
export const FIXED_REFUND_URL = 'https://jowabuzz.com/api/oracle/callback';
export const DEFAULT_ORACLE_BASE_URL = 'https://api.oraclegames.live';
export const LEGACY_ORACLE_BASE_URL = 'https://www.oracleapi.co.uk/getgameurl';

export const GAME_TYPE_OPTIONS = ['SLOT', 'LIVE', 'SPORTS', 'FISH', 'CASINO'];
export const PROVIDER_OPTIONS = ['JILI', 'PGSOFT', 'PRAGMATIC', 'EVOLUTION', 'SPRIBE', 'ORACLE', 'Custom Provider'];
const ORACLE_BALANCE_INQUIRY_TYPES = new Set([
  'BALANCE',
  'GET_BALANCE',
  'GETBALANCE',
  'BALANCE_INQUIRY',
  'CHECK',
  'CHECK_BALANCE',
]);

export function resolveOracleV2PlayerIdentity(user = {}) {
  const phone = String(user.phone || '').trim();
  const name = String(user.name || '').trim();
  const userId = Number(user.id || user.userId || user.user_id || 0);

  return {
    userId,
    playerId: String(userId || user.player_id || user.playerId || '').trim() || String(userId),
    username: phone || name || (userId ? `player_${userId}` : ''),
    apiVersion: 'v2',
  };
}

export function resolveOraclePlayerIdentity(user = {}, options = {}) {
  const gameCode = String(options.gameCode || options.gameUid || '').trim();
  const userId = Number(user.id || user.userId || user.user_id || 0);

  if (isOracleApiV3() && isOracleV3GameUid(gameCode)) {
    return {
      userId,
      playerId: String(userId || user.player_id || user.playerId || '').trim() || String(userId),
      username: buildOracleV3LaunchUsername(userId),
      apiVersion: 'v3',
    };
  }

  return resolveOracleV2PlayerIdentity(user);
}

export function isOracleBalanceInquiryBetType(betType) {
  return ORACLE_BALANCE_INQUIRY_TYPES.has(String(betType || '').trim().toUpperCase());
}

export const DEFAULT_GATEWAY_SETTINGS = {
  providerName: 'Oracle Gaming API',
  providerStatus: 'inactive',
  apiMode: 'demo',
  apiBaseUrl: DEFAULT_ORACLE_BASE_URL,
  apiKey: '',
  secretKey: '',
  operatorId: '',
  callbackUrl: FIXED_CALLBACK_URL,
  refundUrl: FIXED_REFUND_URL,
  webhookSecret: '',
  currency: 'BDT',
  supportedGames: ['SLOT', 'LIVE', 'SPORTS', 'FISH', 'CASINO'],
  supportedProviders: ['JILI', 'PGSOFT', 'PRAGMATIC', 'EVOLUTION', 'SPRIBE', 'ORACLE'],
};

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function maskSecret(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (str.length <= 4) return '****';
  return `${'*'.repeat(Math.min(str.length - 4, 12))}${str.slice(-4)}`;
}

function shouldUpdateSecret(incoming, existing) {
  const value = String(incoming ?? '').trim();
  if (!value) return false;
  if (value.includes('****') && value === maskSecret(existing)) return false;
  return true;
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeApiMode(value) {
  const mode = String(value || 'demo').trim().toLowerCase();
  if (mode !== 'demo' && mode !== 'production') {
    const error = new Error('API mode must be demo or production');
    error.statusCode = 400;
    throw error;
  }
  return mode;
}

function normalizeProviderStatus(value) {
  const status = String(value || 'inactive').trim().toLowerCase();
  return status === 'active' ? 'active' : 'inactive';
}

function mapRow(row, { masked = true } = {}) {
  if (!row) return { ...DEFAULT_GATEWAY_SETTINGS };

  const apiKey = row.api_key || '';
  const secretKey = row.secret_key || '';
  const webhookSecret = row.webhook_secret || '';

  return {
    id: row.id,
    providerName: row.provider_name || DEFAULT_GATEWAY_SETTINGS.providerName,
    providerStatus: row.provider_status || 'inactive',
    apiMode: row.api_mode || 'demo',
    apiBaseUrl: row.api_base_url || DEFAULT_ORACLE_BASE_URL,
    apiKey: masked ? maskSecret(apiKey) : apiKey,
    secretKey: masked ? maskSecret(secretKey) : secretKey,
    webhookSecret: masked ? maskSecret(webhookSecret) : webhookSecret,
    apiKeyConfigured: Boolean(apiKey),
    secretKeyConfigured: Boolean(secretKey),
    webhookSecretConfigured: Boolean(webhookSecret),
    operatorId: row.operator_id || '',
    callbackUrl: FIXED_CALLBACK_URL,
    refundUrl: FIXED_REFUND_URL,
    currency: row.currency || 'BDT',
    supportedGames: parseJsonArray(row.supported_games, DEFAULT_GATEWAY_SETTINGS.supportedGames),
    supportedProviders: parseJsonArray(row.supported_providers, DEFAULT_GATEWAY_SETTINGS.supportedProviders),
    isActive: row.provider_status === 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSettingsRow(db) {
  const [[row]] = await db.query(`SELECT * FROM gaming_gateway_settings ORDER BY id ASC LIMIT 1`);
  if (row) return row;

  await db.query(
    `INSERT INTO gaming_gateway_settings (
       provider_name, provider_status, api_mode, api_base_url, api_key, secret_key,
       operator_id, callback_url, refund_url, webhook_secret, currency,
       supported_games, supported_providers
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_GATEWAY_SETTINGS.providerName,
      DEFAULT_GATEWAY_SETTINGS.providerStatus,
      DEFAULT_GATEWAY_SETTINGS.apiMode,
      DEFAULT_GATEWAY_SETTINGS.apiBaseUrl,
      '',
      '',
      '',
      FIXED_CALLBACK_URL,
      FIXED_REFUND_URL,
      '',
      DEFAULT_GATEWAY_SETTINGS.currency,
      JSON.stringify(DEFAULT_GATEWAY_SETTINGS.supportedGames),
      JSON.stringify(DEFAULT_GATEWAY_SETTINGS.supportedProviders),
    ],
  );

  const [[created]] = await db.query(`SELECT * FROM gaming_gateway_settings ORDER BY id DESC LIMIT 1`);
  return created;
}

async function migrateFromLegacyTable(pool) {
  try {
    const [[legacy]] = await pool.query(`SELECT * FROM gaming_api_settings ORDER BY id ASC LIMIT 1`);
    const [[current]] = await pool.query(`SELECT id FROM gaming_gateway_settings ORDER BY id ASC LIMIT 1`);
    if (!legacy || !current) return;

    await pool.query(
      `UPDATE gaming_gateway_settings SET
         provider_name = COALESCE(NULLIF(provider_name, ''), ?),
         provider_status = ?,
         api_mode = ?,
         api_base_url = COALESCE(NULLIF(api_base_url, ''), ?),
         api_key = CASE WHEN api_key = '' THEN ? ELSE api_key END,
         secret_key = CASE WHEN secret_key = '' THEN ? ELSE secret_key END,
         operator_id = CASE WHEN operator_id = '' THEN ? ELSE operator_id END,
         webhook_secret = CASE WHEN webhook_secret = '' THEN ? ELSE webhook_secret END,
         currency = ?
       WHERE id = ?`,
      [
        legacy.provider_name || DEFAULT_GATEWAY_SETTINGS.providerName,
        legacy.is_active ? 'active' : 'inactive',
        legacy.api_mode || 'demo',
        legacy.base_url || DEFAULT_ORACLE_BASE_URL,
        legacy.api_key || '',
        legacy.secret_key || '',
        legacy.operator_id || '',
        legacy.webhook_secret || '',
        legacy.currency || 'BDT',
        current.id,
      ],
    );
  } catch {
    // legacy table may not exist
  }
}

async function syncOracleEnvCredentials(pool) {
  const env = resolveOracleEnvCredentials();
  if (!env.configured && !env.webhookSecret && !env.operatorId) {
    return;
  }

  const row = await getSettingsRow(pool);
  const updates = [];
  const params = [];

  if (env.apiKey) {
    updates.push('api_key = ?');
    params.push(env.apiKey);
  }
  if (env.secretKey) {
    updates.push('secret_key = ?');
    params.push(env.secretKey);
  }
  if (env.webhookSecret) {
    updates.push('webhook_secret = ?');
    params.push(env.webhookSecret);
  }
  if (env.operatorId) {
    updates.push('operator_id = ?');
    params.push(env.operatorId);
  }
  if (env.apiBaseUrl) {
    updates.push('api_base_url = ?');
    params.push(env.apiBaseUrl);
  }
  if (env.apiMode) {
    updates.push('api_mode = ?');
    params.push(env.apiMode);
  }

  if (!updates.length) return;

  params.push(row.id);
  await pool.query(`UPDATE gaming_gateway_settings SET ${updates.join(', ')} WHERE id = ?`, params);
}

export async function migrateGamingGatewaySchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'gaming_gateway_settings.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(sql)) {
    await pool.query(statement);
  }
  await getSettingsRow(pool);
  await migrateFromLegacyTable(pool);
  await syncOracleEnvCredentials(pool);
}

export async function isGamingGatewayActive() {
  if (String(process.env.ORACLE_ENABLED || '').toLowerCase() === 'false') {
    return false;
  }
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return row.provider_status === 'active';
}

export async function getGamingGatewaySettingsForAdmin() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return mapRow(row, { masked: true });
}

export async function getGamingGatewaySettingsInternal() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return mergeOracleCredentials(mapRow(row, { masked: false }));
}

function normalizeSettingsPayload(payload = {}, existing = null) {
  const current = existing ? mapRow(existing, { masked: false }) : DEFAULT_GATEWAY_SETTINGS;

  const supportedGames = parseJsonArray(payload.supportedGames ?? payload.supported_games, current.supportedGames)
    .map((item) => String(item).trim().toUpperCase())
    .filter((item) => GAME_TYPE_OPTIONS.includes(item));

  const supportedProviders = parseJsonArray(
    payload.supportedProviders ?? payload.supported_providers,
    current.supportedProviders,
  )
    .map((item) => String(item).trim())
    .filter(Boolean);

  if (!supportedGames.length) {
    const error = new Error('Select at least one supported game type');
    error.statusCode = 400;
    throw error;
  }

  if (!supportedProviders.length) {
    const error = new Error('Select at least one supported provider');
    error.statusCode = 400;
    throw error;
  }

  return {
    providerName: String(payload.providerName ?? payload.provider_name ?? current.providerName).trim(),
    providerStatus: normalizeProviderStatus(payload.providerStatus ?? payload.provider_status ?? current.providerStatus),
    apiMode: normalizeApiMode(payload.apiMode ?? payload.api_mode ?? current.apiMode),
    apiBaseUrl: String(payload.apiBaseUrl ?? payload.api_base_url ?? current.apiBaseUrl).trim() || DEFAULT_ORACLE_BASE_URL,
    operatorId: String(payload.operatorId ?? payload.operator_id ?? current.operatorId).trim(),
    callbackUrl: FIXED_CALLBACK_URL,
    refundUrl: FIXED_REFUND_URL,
    currency: String(payload.currency ?? current.currency).trim().replace(/\.$/, '') || 'BDT',
    supportedGames,
    supportedProviders,
    apiKey: shouldUpdateSecret(payload.apiKey ?? payload.api_key, current.apiKey)
      ? String(payload.apiKey ?? payload.api_key).trim()
      : current.apiKey,
    secretKey: shouldUpdateSecret(payload.secretKey ?? payload.secret_key, current.secretKey)
      ? String(payload.secretKey ?? payload.secret_key).trim()
      : current.secretKey,
    webhookSecret: shouldUpdateSecret(payload.webhookSecret ?? payload.webhook_secret, current.webhookSecret)
      ? String(payload.webhookSecret ?? payload.webhook_secret).trim()
      : current.webhookSecret,
  };
}

export async function updateGamingGatewaySettings(payload = {}) {
  const pool = getPool();
  const existing = await getSettingsRow(pool);
  const normalized = normalizeSettingsPayload(payload, existing);

  if (!normalized.providerName) {
    const error = new Error('Provider name is required');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `UPDATE gaming_gateway_settings SET
       provider_name = ?,
       provider_status = ?,
       api_mode = ?,
       api_base_url = ?,
       api_key = ?,
       secret_key = ?,
       operator_id = ?,
       callback_url = ?,
       refund_url = ?,
       webhook_secret = ?,
       currency = ?,
       supported_games = ?,
       supported_providers = ?
     WHERE id = ?`,
    [
      normalized.providerName,
      normalized.providerStatus,
      normalized.apiMode,
      normalized.apiBaseUrl,
      normalized.apiKey,
      normalized.secretKey,
      normalized.operatorId,
      FIXED_CALLBACK_URL,
      FIXED_REFUND_URL,
      normalized.webhookSecret,
      normalized.currency,
      JSON.stringify(normalized.supportedGames),
      JSON.stringify(normalized.supportedProviders),
      existing.id,
    ],
  );

  return getGamingGatewaySettingsForAdmin();
}

export async function setGamingGatewayStatus(status) {
  return updateGamingGatewaySettings({ providerStatus: status === 'active' ? 'active' : 'inactive' });
}

async function oracleRequest(settings, body, requestUrl = null) {
  if (!settings.apiKey) {
    const error = new Error('API key is not configured');
    error.statusCode = 400;
    throw error;
  }

  const targetUrl = requestUrl || settings.apiBaseUrl;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-dstgame-key': settings.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text.slice(0, 500) } : null;
    }

    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveOracleGameListUrl(apiBaseUrl = '') {
  const trimmed = String(apiBaseUrl || '').trim();
  if (!trimmed) return '';
  if (/\/getgamelist\/?$/i.test(trimmed)) return trimmed;
  if (/\/getgameurl\/?$/i.test(trimmed)) {
    return trimmed.replace(/getgameurl\/?$/i, 'getgamelist');
  }
  return trimmed.replace(/\/+$/, '') + '/getgamelist';
}

function extractOracleGamesFromPayload(payload) {
  if (!payload) return [];

  const candidates = [
    payload,
    payload.games,
    payload.glist,
    payload.game_list,
    payload.gameList,
    payload.data,
    payload.data?.games,
    payload.data?.glist,
    payload.data?.game_list,
    payload.data?.gameList,
    payload.result,
    payload.result?.games,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) {
      return candidate;
    }
  }

  return [];
}

function normalizeOracleCatalogGame(raw = {}, fallbackProvider = '', fallbackGameType = 'SLOT') {
  const code = String(
    raw.game_code || raw.gameCode || raw.code || raw.gameid || raw.game_id || raw.real_game_id || '',
  ).trim();
  const name = String(raw.name || raw.game_name || raw.gameName || raw.title || code).trim();
  if (!code || !name) return null;

  const provider = String(
    raw.provider_code || raw.providerCode || raw.provider || raw.platform || fallbackProvider || '',
  )
    .trim()
    .toUpperCase();

  const gameType = String(raw.game_type || raw.gameType || raw.gametype || raw.category || fallbackGameType)
    .trim()
    .toUpperCase();

  const imageUrl = String(
    raw.image_url || raw.imageUrl || raw.image || raw.icon || raw.thumbnail || '',
  ).trim();

  const category = String(raw.category || gameType || 'SLOT').trim().toLowerCase();

  return {
    code,
    name,
    provider,
    gameType: gameType === 'SLOTS' ? 'SLOT' : gameType,
    category,
    imageUrl: imageUrl || null,
    isLive: ['LIVE', 'CASINO', 'TABLE'].includes(gameType),
  };
}

export async function fetchOracleGameCatalog() {
  const settings = await getGamingGatewaySettingsInternal();
  const testProviderOnly = String(process.env.ORACLE_GAMES_V3_SYNC_TEST_PROVIDER || '').trim() || null;

  if (settings.apiKey || settings.launchKey || settings.dstGameKey) {
    try {
      const catalog = await fetchOracleGamesCatalog(settings, {
        providers: settings.supportedProviders || [],
        gameTypes: settings.supportedGames || ['SLOT'],
        testProviderOnly,
      });
      if (catalog.length) {
        return catalog;
      }
    } catch (error) {
      if (error.statusCode && error.statusCode !== 502) {
        throw error;
      }
    }
  }

  if (!settings.apiBaseUrl || settings.apiBaseUrl.includes('oraclegames.live')) {
    const error = new Error('No games returned from OracleGames API');
    error.statusCode = 502;
    throw error;
  }

  if (!settings.apiBaseUrl) {
    const error = new Error('API base URL is required');
    error.statusCode = 400;
    throw error;
  }

  if (!settings.apiKey) {
    const error = new Error('API key is required');
    error.statusCode = 400;
    throw error;
  }

  const listUrl = resolveOracleGameListUrl(settings.apiBaseUrl);
  const providers = (settings.supportedProviders || []).map((item) => String(item).trim()).filter(Boolean);
  const gameTypes = (settings.supportedGames || ['SLOT']).map((item) => String(item).trim()).filter(Boolean);
  const collected = [];
  const seen = new Set();

  const ingestPayload = (payload, fallbackProvider, fallbackGameType) => {
    extractOracleGamesFromPayload(payload).forEach((item) => {
      const normalized = normalizeOracleCatalogGame(item, fallbackProvider, fallbackGameType);
      if (!normalized) return;
      const key = `${normalized.provider}:${normalized.code}`.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      collected.push(normalized);
    });
  };

  if (providers.length) {
    for (const providerCode of providers) {
      for (const gameType of gameTypes.length ? gameTypes : ['SLOT']) {
        const { data } = await oracleRequest(
          settings,
          {
            action: 'list',
            provider_code: providerCode,
            game_type: gameType,
          },
          listUrl,
        );
        ingestPayload(data, providerCode, gameType);
      }
    }
  }

  if (!collected.length) {
    const { data } = await oracleRequest(settings, { action: 'list' }, listUrl);
    ingestPayload(data, providers[0] || '', gameTypes[0] || 'SLOT');
  }

  return collected;
}

export async function testGamingGatewayConnection() {
  const settings = await getGamingGatewaySettingsInternal();

  if (isOracleApiV3() || settings.apiKey || settings.dstGameKey || settings.launchKey) {
    const result = await testOracleGamesConnection(settings);
    return {
      ...result,
      providerName: settings.providerName,
      apiMode: settings.apiMode,
      apiVersion: isOracleApiV3() ? 'v3' : 'v2',
    };
  }

  if (!settings.apiBaseUrl) {
    const error = new Error('API base URL is required');
    error.statusCode = 400;
    throw error;
  }

  if (!settings.apiKey) {
    const error = new Error('API key is required');
    error.statusCode = 400;
    throw error;
  }

  const { response, data } = await oracleRequest(settings, {
    username: 'connection_test',
    money: 0,
    game_code: 'TEST',
    provider_code: settings.supportedProviders[0] || 'JILI',
    game_type: settings.supportedGames[0] || 'SLOT',
  });

  const success = response.ok || data?.status === true;

  return {
    success,
    status: response.status,
    message: success ? 'API connection successful' : `API responded with HTTP ${response.status}`,
    providerName: settings.providerName,
    apiMode: settings.apiMode,
    preview: data,
  };
}

export async function testGamingGameLaunch(payload = {}) {
  const settings = await getGamingGatewaySettingsInternal();

  if (isOracleApiV3()) {
    const body = {
      username: String(payload.username || buildOracleV3LaunchUsername(1)).trim(),
      money: Number(payload.money ?? 100),
      game_uid: String(payload.game_uid || payload.gameUid || payload.game_code || payload.gameCode || process.env.ORACLE_GAMES_V3_TEST_GAME_UID || '4eef5090166a6889956a630321713366').trim(),
    };

    if (!body.username || !body.game_uid) {
      const error = new Error('username and game_uid are required for V3 test launch');
      error.statusCode = 400;
      throw error;
    }

    const launch = await launchOracleGame(settings, body);
    return {
      success: launch.success,
      status: launch.success ? 200 : 502,
      message: launch.message || (launch.success ? 'V3 game launch URL received' : 'V3 launch failed'),
      gameUrl: launch.gameUrl,
      request: body,
      response: launch.response,
      source: launch.source,
      apiVersion: 'v3',
    };
  }

  const body = {
    username: String(payload.username || 'test1235').trim(),
    money: Number(payload.money ?? 100),
    game_code: String(payload.game_code || payload.gameCode || '230').trim(),
    provider_code: String(payload.provider_code || payload.providerCode || 'JILIS').trim(),
    game_type: String(payload.game_type || payload.gameType || 'SLOT').trim().toUpperCase(),
  };

  if (!body.username || !body.game_code || !body.provider_code || !body.game_type) {
    const error = new Error('username, money, game_code, provider_code and game_type are required');
    error.statusCode = 400;
    throw error;
  }

  if (settings.apiKey) {
    const launch = await launchOracleGame(settings, body);
    return {
      success: launch.success,
      status: launch.success ? 200 : 502,
      message: launch.message,
      gameUrl: launch.gameUrl,
      request: body,
      response: launch.response,
      source: launch.source,
    };
  }

  const { response, data } = await oracleRequest(settings, body);
  const gameUrl = data?.game_url || data?.gameUrl || null;
  const success = Boolean(data?.status === true && gameUrl);

  return {
    success,
    status: response.status,
    message: success ? 'Game launch URL received' : data?.message || `Launch failed (HTTP ${response.status})`,
    gameUrl,
    request: body,
    response: data,
  };
}

export function resolveOracleGameType(game = {}) {
  const raw = String(game.game_type || game.gameType || game.category || 'SLOT')
    .trim()
    .toUpperCase();

  if (['HOT', 'SLOTS', 'SLOT'].includes(raw)) return 'SLOT';
  if (['CRASH', 'TABLE', 'LIVE', 'CASINO', 'FISH', 'FISHING', 'SPORTS', 'ARCADE', 'LOTTERY'].includes(raw)) {
    return raw === 'FISHING' ? 'FISH' : raw;
  }

  return 'SLOT';
}

export async function launchOracleGameSession({ user, game, sessionToken, launchBalance: presetBalance }) {
  const settings = await getGamingGatewaySettingsInternal();
  if (settings.providerStatus !== 'active') {
    const error = new Error('Gaming gateway is disabled');
    error.statusCode = 503;
    throw error;
  }

  let providerCode = String(game.provider_code || game.providerCode || '').trim();
  if (providerCode === 'Evolution' || providerCode === 'EVOLUTION') {
    providerCode = 'EVOASIA';
  }
  const gameCode = String(game.code || game.game_code || '').trim();
  const gameType = resolveOracleGameType(game);
  let launchBalance;

  if (presetBalance !== undefined && presetBalance !== null) {
    launchBalance = Math.max(0, Math.floor(Number(presetBalance)));
  } else {
    const syncedBalance = await syncAllWalletBalances(user.id);
    launchBalance = Math.max(0, Math.floor(Number(syncedBalance ?? user.balance ?? 0)));
  }

  const identity = resolveOraclePlayerIdentity(user, { gameCode });
  const launchUsername = isOracleApiV3()
    ? buildOracleV3LaunchUsername(identity.userId)
    : identity.username;

  const launchBody = {
    username: launchUsername,
    user_id: identity.userId,
    money: launchBalance,
    game_code: gameCode,
    game_uid: gameCode,
    game_name: String(game.name || game.title || '').trim(),
    provider_code: providerCode,
    game_type: gameType,
    operator_id: settings.operatorId || undefined,
    callback_url: FIXED_CALLBACK_URL,
  };

  console.log('[Oracle Launch]', {
    userId: identity.userId,
    playerId: identity.playerId,
    username: launchBody.username,
    providerCode: launchBody.provider_code,
    gameCode: launchBody.game_code,
    gameType: launchBody.game_type,
    balance: launchBody.money,
    currency: launchBody.currency,
  });

  console.log('[WALLET_DEBUG][Launch API]', JSON.stringify({
    username: identity.username,
    playerId: identity.playerId,
    userId: identity.userId,
    requestBody: launchBody,
    dbWalletBalance: launchBalance,
  }));

  await recordOracleLaunchSession({
    userId: identity.userId,
    username: launchUsername,
    playerId: identity.playerId,
    providerCode: launchBody.provider_code,
    gameCode: launchBody.game_code,
    sessionToken,
  });

  if (settings.apiKey || settings.launchKey || settings.dstGameKey) {
    const launch = await launchOracleGame(settings, launchBody);
    if (!launch.success || !launch.gameUrl) {
      const providerMessage = launch.message || launch.response?.message || 'Failed to launch game from provider';
      console.log('[WALLET_DEBUG][Launch API]', JSON.stringify({
        username: identity.username,
        playerId: identity.playerId,
        requestBody: launchBody,
        dbWalletBalance: launchBalance,
        providerResponse: launch.response ?? null,
        error: providerMessage,
      }));
      const error = new Error(
        providerMessage === 'Server Error'
          ? 'Game provider is temporarily unavailable. Please try again.'
          : providerMessage,
      );
      error.statusCode = 502;
      throw error;
    }

    console.log('[WALLET_DEBUG][Launch API]', JSON.stringify({
      username: identity.username,
      playerId: identity.playerId,
      userId: identity.userId,
      requestBody: launchBody,
      dbWalletBalance: launchBalance,
      providerResponse: launch.response ?? null,
      responseBody: {
        launchUrl: launch.gameUrl,
        balance: launchBalance,
        username: identity.username,
        playerId: identity.playerId,
      },
    }));

    return {
      launchUrl: launch.gameUrl,
      sessionToken,
      provider: settings.providerName,
      mode: settings.apiMode,
      demo: settings.apiMode === 'demo',
      playerId: identity.playerId,
      userId: identity.userId,
      username: identity.username,
      balance: launchBalance,
    };
  }

  const { data } = await oracleRequest(settings, launchBody);

  if (!data?.status || !(data.game_url || data.gameUrl)) {
    const error = new Error(data?.message || 'Failed to launch game from provider');
    error.statusCode = 502;
    throw error;
  }

  return {
    launchUrl: data.game_url || data.gameUrl,
    sessionToken,
    provider: settings.providerName,
    mode: settings.apiMode,
    demo: settings.apiMode === 'demo',
  };
}

async function findUserByUsername(connection, username, accountId = null) {
  const term = String(username || '').trim();
  const accountTerm = String(accountId || '').trim();
  if (!term && !accountTerm) return null;

  const selectUser = `SELECT id, name, phone, balance, status FROM users`;

  const loadUserById = async (userId) => {
    if (!userId || !Number.isFinite(Number(userId))) return null;
    const [[row]] = await connection.query(
      `${selectUser}
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [Number(userId)],
    );
    return row || null;
  };

  if (accountTerm) {
    if (/^\d+$/.test(accountTerm)) {
      const byAccountId = await loadUserById(Number(accountTerm));
      if (byAccountId) return byAccountId;
    }

    const [[byAccountPhone]] = await connection.query(
      `${selectUser}
       WHERE phone = ? OR name = ?
       LIMIT 1
       FOR UPDATE`,
      [accountTerm, accountTerm],
    );
    if (byAccountPhone) return byAccountPhone;
  }

  if (term) {
    if (isOracleV3LaunchUsername(term)) {
      const [[mappedV3]] = await connection.query(
        `SELECT u.id, u.name, u.phone, u.balance, u.status
         FROM gaming_transactions gt
         INNER JOIN users u ON u.id = gt.user_id
         WHERE gt.username = ? AND gt.user_id IS NOT NULL
         ORDER BY gt.id DESC
         LIMIT 1
         FOR UPDATE`,
        [term],
      );
      if (mappedV3) return mappedV3;
    }

    const [[row]] = await connection.query(
      `${selectUser}
       WHERE name = ? OR phone = ?
       LIMIT 1
       FOR UPDATE`,
      [term, term],
    );
    if (row) return row;

    if (/^\d+$/.test(term)) {
      const byId = await loadUserById(Number(term));
      if (byId) return byId;
    }

    const playerMatch = term.match(/^player[_-]?(\d+)$/i);
    if (playerMatch) {
      const byPlayerId = await loadUserById(Number(playerMatch[1]));
      if (byPlayerId) return byPlayerId;
    }

    const [[mapped]] = await connection.query(
      `SELECT u.id, u.name, u.phone, u.balance, u.status
       FROM gaming_transactions gt
       INNER JOIN users u ON u.id = gt.user_id
       WHERE gt.username = ? AND gt.user_id IS NOT NULL
       ORDER BY gt.id DESC
       LIMIT 1
       FOR UPDATE`,
      [term],
    );
    if (mapped) return mapped;

    if (isOracleV3LaunchUsername(term)) {
      const [activeUsers] = await connection.query(
        `SELECT id FROM users WHERE status = 'active' ORDER BY id ASC`,
      );
      for (const candidate of activeUsers) {
        if (buildOracleV3LaunchUsername(candidate.id) === term) {
          const byV3 = await loadUserById(candidate.id);
          if (byV3) return byV3;
        }
      }
    }

    const embeddedDigits = term.match(/(\d{10,15})/);
    if (embeddedDigits) {
      const phoneDigits = embeddedDigits[1];
      const [[byEmbeddedPhone]] = await connection.query(
        `${selectUser}
         WHERE phone = ? OR phone LIKE ?
         LIMIT 1
         FOR UPDATE`,
        [phoneDigits, `%${phoneDigits.slice(-10)}`],
      );
      if (byEmbeddedPhone) return byEmbeddedPhone;
    }
  }

  return null;
}

function collectOracleVerificationKeys(settings = {}) {
  const keys = [];
  const push = (value) => {
    const trimmed = String(value || '').trim();
    if (trimmed && !keys.includes(trimmed)) keys.push(trimmed);
  };

  push(settings.webhookSecret);
  push(settings.secretKey);
  push(settings.dstGameKey);
  push(settings.apiKey);

  return keys;
}

function validateVerificationKey(settings, providedKey) {
  // Verification key validation bypassed as requested
  return;

  const expectedKeys = collectOracleVerificationKeys(settings);
  const provided = String(providedKey || '').trim();
  const configuredWebhookSecret = String(settings.webhookSecret || '').trim();

  if (!expectedKeys.length) {
    return;
  }

  if (!provided) {
    if (!configuredWebhookSecret) {
      return;
    }
    const error = new Error('verification_key is required');
    error.statusCode = 400;
    throw error;
  }

  if (!expectedKeys.includes(provided)) {
    const error = new Error('Invalid verification key');
    error.statusCode = 401;
    throw error;
  }
}

export function verifyGamingWebhookSecret(providedSecret, settings) {
  const provided = String(providedSecret || '').trim();
  if (!provided) return false;
  return collectOracleVerificationKeys(settings).includes(provided);
}

async function findExistingGamingTransaction(connection, transactionId) {
  const [[existing]] = await connection.query(
    `SELECT id, user_id, username, amount, bet_type, status
     FROM gaming_transactions
     WHERE transaction_id = ?
     LIMIT 1`,
    [transactionId],
  );
  return existing || null;
}

async function insertGamingTransaction(connection, {
  userId,
  username,
  accountId,
  providerCode,
  gameCode,
  amount,
  betType,
  transactionId,
  verificationKey,
  status,
  rawPayload,
}) {
  await connection.query(
    `INSERT INTO gaming_transactions
       (user_id, username, account_id, provider_code, game_code, amount, bet_type,
        transaction_id, verification_key, status, raw_payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      username,
      accountId,
      providerCode,
      gameCode,
      amount,
      betType,
      transactionId,
      verificationKey,
      status,
      JSON.stringify(rawPayload || null),
    ],
  );
}

function normalizeOracleBalanceAmount(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
}

function buildCallbackSuccess({
  betType,
  username,
  transactionId,
  balance,
  currency,
  duplicate = false,
}) {
  const normalizedBalance = normalizeOracleBalanceAmount(balance);

  return {
    success: true,
    status: true,
    duplicate,
    message: duplicate ? 'Transaction already processed' : `${betType} processed`,
    username,
    accountName: username,
    transactionId,
    transaction_id: transactionId,
    balance: normalizedBalance,
    money: normalizedBalance,
    currency,
    errorCode: 0,
    errorMessage: 'No Error',
  };
}

export function buildCallbackError(message, statusCode = 500) {
  const errorCode = statusCode === 404 ? 1 : statusCode === 400 ? 2 : statusCode === 401 ? 3 : 7;

  return {
    success: false,
    status: false,
    errorCode,
    errorMessage: message,
    balance: 0,
    money: 0,
  };
}

export async function recordOracleLaunchSession({
  userId,
  username,
  playerId,
  providerCode,
  gameCode,
  sessionToken,
}) {
  const pool = getPool();
  const txId = `session_${String(sessionToken || '').trim()}`;
  if (!userId || !txId || txId === 'session_') return;

  try {
    await pool.query(
      `INSERT INTO gaming_transactions
         (user_id, username, account_id, provider_code, game_code, amount, bet_type,
          transaction_id, status, raw_payload)
       VALUES (?, ?, ?, ?, ?, 0, 'SESSION', ?, 'completed', ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         username = VALUES(username),
         account_id = VALUES(account_id),
         provider_code = VALUES(provider_code),
         game_code = VALUES(game_code)`,
      [
        userId,
        String(username || '').trim(),
        String(playerId || userId || '').trim(),
        providerCode || null,
        gameCode || null,
        txId,
        JSON.stringify({ userId, username, playerId, providerCode, gameCode, sessionToken }),
      ],
    );
  } catch (error) {
    console.warn('[Oracle Session] failed to record launch mapping', {
      userId,
      username,
      message: error.message,
    });
  }
}

function isOracleV3SeamlessCallback(rawPayload = {}) {
  const serial = rawPayload.serial_number || rawPayload.serialNumber;
  const member = rawPayload.member_account || rawPayload.memberAccount;
  const betAmount = Number(rawPayload.bet_amount ?? rawPayload.betAmount ?? 0);
  const winAmount = Number(rawPayload.win_amount ?? rawPayload.winAmount ?? 0);
  return Boolean(serial && member && (betAmount > 0 || winAmount > 0));
}

function normalizeOracleCallbackPayload(payload = {}) {
  const method = String(payload.method || '').trim();
  const betType = payload.bet_type ?? payload.betType ?? payload.type ?? payload.action ?? method;
  const normalizedBetType = normalizeCallbackBetType(betType);

  return {
    ...payload,
    verification_key:
      payload.verification_key ??
      payload.verificationKey ??
      payload.secret ??
      payload.companyKey ??
      payload.company_key ??
      '',
    username:
      payload.username ??
      payload.user_name ??
      payload.userName ??
      payload.member_account ??
      payload.memberAccount ??
      payload.member_id ??
      payload.memberId ??
      payload.accountName ??
      payload.user_id ??
      payload.userId ??
      '',
    bet_type: normalizedBetType,
    transaction_id:
      payload.transaction_id ??
      payload.transactionId ??
      payload.serial_number ??
      payload.serialNumber ??
      payload.tx_id ??
      payload.txId ??
      payload.uniqid ??
      '',
    amount:
      payload.amount ??
      payload.money ??
      payload.bet_amount ??
      payload.betAmount ??
      0,
    win_amount: payload.win_amount ?? payload.winAmount ?? null,
    bet_amount: payload.bet_amount ?? payload.betAmount ?? null,
    game_round: payload.game_round ?? payload.gameRound ?? null,
    game_uid: payload.game_uid ?? payload.gameUid ?? null,
    account_id:
      payload.account_id ??
      payload.accountId ??
      payload.user_id ??
      payload.userId ??
      payload.player_id ??
      payload.playerId ??
      null,
    provider_code: payload.provider_code ?? payload.providerCode ?? null,
    game_code: payload.game_code ?? payload.gameCode ?? payload.game_uid ?? payload.gameUid ?? null,
  };
}

function normalizeCallbackBetType(value) {
  const betType = String(value || '').trim().toUpperCase();
  if (['GETBALANCE', 'GET_BALANCE', 'BALANCE', 'BALANCE_INQUIRY', 'CHECK_BALANCE'].includes(betType)) {
    return 'BALANCE';
  }
  if (['WIN', 'CREDIT', 'PAYOUT', 'PRIZE', 'SETTLE'].includes(betType)) return 'SETTLE';
  if (['DEBIT', 'WAGER', 'STAKE', 'BET'].includes(betType)) return 'BET';
  if (['CANCEL_BET', 'UNDO', 'ROLLBACK', 'REFUND', 'CANCEL'].includes(betType)) return 'ROLLBACK';
  return betType;
}

function resolveCallbackDelta(betType, amount) {
  if (betType === 'BET') {
    if (!amount || amount <= 0) {
      const error = new Error('Invalid bet amount');
      error.statusCode = 400;
      throw error;
    }
    return -amount;
  }

  if (betType === 'SETTLE') {
    if (amount < 0) {
      const error = new Error('Invalid settle amount');
      error.statusCode = 400;
      throw error;
    }
    return amount;
  }

  if (['ROLLBACK', 'CANCEL', 'REFUND'].includes(betType)) {
    if (!amount || amount <= 0) {
      const error = new Error('Invalid rollback amount');
      error.statusCode = 400;
      throw error;
    }
    return amount;
  }

  const error = new Error('Unsupported bet_type for callback');
  error.statusCode = 400;
  throw error;
}

function walletDebugRouteLabel(betType, balanceInquiry) {
  if (balanceInquiry || betType === 'BALANCE') return 'BALANCE callback';
  if (betType === 'BET') return 'BET callback';
  if (betType === 'SETTLE') return 'WIN callback';
  if (betType === 'ROUND') return 'V3 ROUND callback';
  if (['ROLLBACK', 'CANCEL', 'REFUND'].includes(betType)) return 'ROLLBACK callback';
  return `${betType} callback`;
}

async function processOracleV3RoundCallback(rawPayload = {}) {
  const settings = await getGamingGatewaySettingsInternal();
  const payload = normalizeOracleCallbackPayload(rawPayload);
  validateVerificationKey(settings, payload.verification_key);

  const username = String(payload.username || '').trim();
  const transactionId = String(payload.transaction_id || '').trim();
  const betAmount = Math.max(0, Number(payload.bet_amount ?? 0));
  const winAmount = Math.max(0, Number(payload.win_amount ?? 0));
  const gameRound = String(payload.game_round || '').trim();
  const gameUid = String(payload.game_uid || payload.game_code || '').trim();
  const debugRoute = walletDebugRouteLabel('ROUND', false);

  console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
    phase: 'request',
    username,
    transactionId,
    betAmount,
    winAmount,
    gameRound,
    gameUid,
    requestBody: rawPayload,
  }));

  if (!username || !transactionId) {
    const error = new Error('member_account and serial_number are required');
    error.statusCode = 400;
    throw error;
  }

  if (betAmount <= 0 && winAmount <= 0) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
      const user = await findUserByUsername(connection, username, payload.account_id);
      if (!user || user.status !== 'active') {
        const error = new Error('User not found or inactive');
        error.statusCode = 404;
        throw error;
      }
      await syncAllWalletBalances(user.id, connection);
      const [[freshUser]] = await connection.query(
        `SELECT balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
        [user.id],
      );
      const balance = normalizeOracleBalanceAmount(freshUser?.balance ?? user.balance ?? 0);
      const response = buildCallbackSuccess({
        betType: 'BALANCE',
        username,
        transactionId: transactionId || `balance_${user.id}_${Date.now()}`,
        balance,
        currency: settings.currency,
      });
      console.log(`[WALLET_DEBUG][BALANCE callback]`, JSON.stringify({
        phase: 'v3_balance_fallback',
        username,
        userId: user.id,
        balance,
      }));
      return response;
    } finally {
      connection.release();
    }
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingTx = await findExistingGamingTransaction(connection, transactionId);
    if (existingTx) {
      const user = await findUserByUsername(connection, username, payload.account_id);
      const balance = user ? normalizeOracleBalanceAmount(user.balance) : null;
      const dupResponse = buildCallbackSuccess({
        betType: 'ROUND',
        username,
        transactionId,
        balance,
        currency: settings.currency,
        duplicate: true,
      });
      await connection.commit();
      return dupResponse;
    }

    const user = await findUserByUsername(connection, username, payload.account_id);
    if (!user || user.status !== 'active') {
      const error = new Error('User not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    const netDelta = winAmount - betAmount;
    if (betAmount > 0) {
      const [[freshUser]] = await connection.query(
        `SELECT balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
        [user.id],
      );
      const currentBalance = Number(freshUser?.balance ?? user.balance ?? 0);
      if (currentBalance < betAmount) {
        const error = new Error('Insufficient balance');
        error.statusCode = 400;
        throw error;
      }
    }

    const balance = await applyBalanceDelta(connection, user.id, netDelta);

    await insertGamingTransaction(connection, {
      userId: user.id,
      username,
      accountId: payload.account_id || null,
      providerCode: payload.provider_code || null,
      gameCode: gameUid || payload.game_code || null,
      amount: Math.abs(netDelta),
      betType: 'ROUND',
      transactionId,
      verificationKey: payload.verification_key || null,
      status: 'completed',
      rawPayload: {
        ...payload,
        game_round: gameRound || payload.game_round,
        bet_amount: betAmount,
        win_amount: winAmount,
        net_delta: netDelta,
      },
    });

    if (betAmount > 0) {
      await connection.query(
        `UPDATE user_wallets SET completed_turnover = completed_turnover + ? WHERE user_id = ?`,
        [betAmount, user.id],
      );
      await applyBonusClaimTurnover(connection, user.id, betAmount);
      await applyDepositBonusTurnover(connection, user.id, betAmount);
      await trackOracleBetForAffiliate(user.id, betAmount, transactionId, connection);
    }
    if (winAmount > 0) {
      await settleOracleBetForAffiliate(user.id, winAmount, connection);
    }

    await processUserVipProgress(user.id, connection, { betAmount });
    await connection.commit();

    const response = buildCallbackSuccess({
      betType: 'ROUND',
      username,
      transactionId,
      balance,
      currency: payload.currency_code || settings.currency,
    });

    console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
      phase: 'response',
      username,
      playerId: user.id,
      requestBody: rawPayload,
      dbWalletBalance: balance,
      responseBody: response,
    }));

    return response;
  } catch (error) {
    console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
      phase: 'error',
      username,
      requestBody: rawPayload,
      responseBody: { error: error.message, statusCode: error.statusCode || 500 },
    }));
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function resolveIncomingCallbackBetType(rawPayload = {}, payload = {}) {
  let betType = normalizeCallbackBetType(payload.bet_type);
  const username = String(payload.username || '').trim();

  if (betType && betType !== '') {
    return betType;
  }

  const action = String(
    rawPayload.action || rawPayload.method || rawPayload.type || rawPayload.event || '',
  ).toUpperCase();
  if (isOracleBalanceInquiryBetType(action)) {
    return 'BALANCE';
  }

  if (
    username
    && (rawPayload.member_account || rawPayload.memberAccount)
    && !isOracleV3SeamlessCallback(rawPayload)
  ) {
    return 'BALANCE';
  }

  return betType;
}

export async function processOracleCallback(rawPayload = {}) {
  if (isOracleV3SeamlessCallback(rawPayload)) {
    return processOracleV3RoundCallback(rawPayload);
  }

  const settings = await getGamingGatewaySettingsInternal();
  const payload = normalizeOracleCallbackPayload(rawPayload);
  validateVerificationKey(settings, payload.verification_key);

  const betType = resolveIncomingCallbackBetType(rawPayload, payload);
  const transactionId = String(payload.transaction_id || '').trim();
  const amount = Number(payload.amount || 0);
  const username =
    String(payload.username || '').trim() ||
    String(
      payload.account_id ??
      payload.user_id ??
      payload.player_id ??
      payload.playerId ??
      '',
    ).trim();
  const balanceInquiry = isOracleBalanceInquiryBetType(betType);
  const debugRoute = walletDebugRouteLabel(betType, balanceInquiry);

  console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
    phase: 'request',
    username,
    playerId: payload.account_id || payload.user_id || payload.player_id || payload.playerId || null,
    requestBody: rawPayload,
  }));

  console.log('[Oracle Callback]', {
    betType,
    transactionId: transactionId || null,
    username,
    amount,
    balanceInquiry,
    providerCode: payload.provider_code || null,
    gameCode: payload.game_code || null,
    accountId: payload.account_id || payload.user_id || payload.player_id || null,
  });

  if (balanceInquiry) {
    console.log('[Oracle BALANCE Callback Received]', {
      username,
      accountId: payload.account_id || payload.user_id || payload.player_id || null,
      transactionId: transactionId || null,
      verificationKeyProvided: Boolean(payload.verification_key),
    });
  }

  if (!username || !betType) {
    const error = new Error('username and bet_type are required');
    error.statusCode = 400;
    throw error;
  }

  if (!balanceInquiry && !transactionId) {
    const error = new Error('transaction_id is required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (balanceInquiry) {
      const user = await findUserByUsername(
        connection,
        username,
        payload.account_id || payload.user_id || payload.player_id || payload.playerId,
      );
      if (!user || user.status !== 'active') {
        const error = new Error('User not found or inactive');
        error.statusCode = 404;
        throw error;
      }

      await syncAllWalletBalances(user.id, connection);
      const [[freshUser]] = await connection.query(
        `SELECT balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
        [user.id],
      );
      const balance = normalizeOracleBalanceAmount(freshUser?.balance ?? user.balance ?? 0);
      await connection.commit();

      const response = buildCallbackSuccess({
        betType,
        username,
        transactionId: transactionId || `balance_${user.id}_${Date.now()}`,
        balance,
        currency: settings.currency,
      });

      logOracleCallbackUserMatch({
        usernamePlayerId: username,
        matchedUserId: user.id,
        callbackType: betType,
        returnedBalance: balance,
        userStatus: user.status,
      });

      console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
        phase: 'response',
        username,
        playerId: user.id,
        requestBody: rawPayload,
        dbWalletBalance: balance,
        responseBody: response,
      }));

      console.log('[Oracle BALANCE Callback Response]', {
        userId: user.id,
        username: response.username,
        balance: response.balance,
        money: response.money,
        currency: response.currency,
        errorCode: response.errorCode,
      });

      return response;
    }

    const existingTx = await findExistingGamingTransaction(connection, transactionId);
    if (existingTx) {
      const user = await findUserByUsername(
        connection,
        username,
        payload.account_id || payload.user_id || payload.player_id || payload.playerId,
      );
      const balance = user ? Number(user.balance) : null;
      const dupResponse = buildCallbackSuccess({
        betType: existingTx.bet_type || betType,
        username,
        transactionId,
        balance,
        currency: settings.currency,
        duplicate: true,
      });
      console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
        phase: 'response',
        username,
        playerId: user?.id ?? null,
        requestBody: rawPayload,
        dbWalletBalance: balance,
        responseBody: dupResponse,
        duplicate: true,
      }));
      await connection.commit();
      return dupResponse;
    }

    const user = await findUserByUsername(
      connection,
      username,
      payload.account_id || payload.user_id || payload.player_id || payload.playerId,
    );
    if (!user || user.status !== 'active') {
      const error = new Error('User not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    const delta = resolveCallbackDelta(betType, amount);
    const balance = await applyBalanceDelta(connection, user.id, delta);

    await insertGamingTransaction(connection, {
      userId: user.id,
      username,
      accountId: payload.account_id || null,
      providerCode: payload.provider_code || null,
      gameCode: payload.game_code || null,
      amount,
      betType,
      transactionId,
      verificationKey: payload.verification_key || null,
      status: betType === 'ROLLBACK' || betType === 'CANCEL' || betType === 'REFUND' ? 'refunded' : 'completed',
      rawPayload: payload,
    });

    if (betType === 'BET') {
      await connection.query(
        `UPDATE user_wallets SET completed_turnover = completed_turnover + ? WHERE user_id = ?`,
        [amount, user.id],
      );
      await applyBonusClaimTurnover(connection, user.id, amount);
      await applyDepositBonusTurnover(connection, user.id, amount);
      await trackOracleBetForAffiliate(user.id, amount, transactionId, connection);
      await processUserVipProgress(user.id, connection, { betAmount: amount });
    } else if (betType === 'SETTLE') {
      await settleOracleBetForAffiliate(user.id, amount, connection);
    } else if (['ROLLBACK', 'CANCEL', 'REFUND'].includes(betType)) {
      await cancelOracleBetForAffiliate(user.id, connection);
    }

    await connection.commit();

    const txResponse = buildCallbackSuccess({
      betType,
      username,
      transactionId,
      balance,
      currency: settings.currency,
    });

    logOracleCallbackUserMatch({
      usernamePlayerId: username,
      matchedUserId: user.id,
      callbackType: betType,
      returnedBalance: balance,
      userStatus: user.status,
    });

    console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
      phase: 'response',
      username,
      playerId: user.id,
      requestBody: rawPayload,
      dbWalletBalance: balance,
      responseBody: txResponse,
    }));

    return txResponse;
  } catch (error) {
    console.log(`[WALLET_DEBUG][${debugRoute}]`, JSON.stringify({
      phase: 'error',
      username,
      playerId: payload.account_id || payload.user_id || payload.player_id || null,
      requestBody: rawPayload,
      responseBody: { error: error.message, statusCode: error.statusCode || 500 },
    }));
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function processOracleRefund(rawPayload = {}) {
  const settings = await getGamingGatewaySettingsInternal();
  const payload = normalizeOracleCallbackPayload(rawPayload);
  validateVerificationKey(settings, payload.verification_key);

  const transactionId = String(payload.transaction_id || '').trim();
  const refundTxId = `refund_${transactionId}`;
  const amount = Number(payload.amount || 0);
  const username = String(payload.username || '').trim();

  if (!transactionId || !username) {
    const error = new Error('username and transaction_id are required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const existingRefund = await findExistingGamingTransaction(connection, refundTxId);
    if (existingRefund) {
      const duplicateUser = await findUserByUsername(
        connection,
        username,
        payload.account_id || payload.user_id || payload.player_id || payload.playerId,
      );
      await connection.commit();
      return {
        success: true,
        status: true,
        duplicate: true,
        message: 'Refund already processed',
        username,
        transactionId,
        balance: duplicateUser ? Number(duplicateUser.balance) : null,
        restoredAmount: Number(existingRefund.amount || 0),
        currency: settings.currency,
      };
    }

    const user = await findUserByUsername(
      connection,
      username,
      payload.account_id || payload.user_id || payload.player_id || payload.playerId,
    );
    if (!user || user.status !== 'active') {
      const error = new Error('User not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    const [[original]] = await connection.query(
      `SELECT id, amount, bet_type, status
       FROM gaming_transactions
       WHERE transaction_id = ?
       LIMIT 1`,
      [transactionId],
    );

    const restoreAmount = amount > 0 ? amount : Number(original?.amount || 0);
    if (!restoreAmount) {
      const error = new Error('Refund amount is required');
      error.statusCode = 400;
      throw error;
    }

    const balance = await applyBalanceDelta(connection, user.id, restoreAmount);

    if (original) {
      await connection.query(`UPDATE gaming_transactions SET status = 'refunded' WHERE id = ?`, [original.id]);
    }

    await insertGamingTransaction(connection, {
      userId: user.id,
      username,
      accountId: payload.account_id || null,
      providerCode: payload.provider_code || null,
      gameCode: payload.game_code || null,
      amount: restoreAmount,
      betType: 'REFUND',
      transactionId: refundTxId,
      verificationKey: payload.verification_key || null,
      status: 'refunded',
      rawPayload: payload,
    });

    await connection.commit();

    return {
      success: true,
      status: true,
      message: 'Refund processed',
      username,
      transactionId,
      balance,
      restoredAmount: restoreAmount,
      currency: settings.currency,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildSimplePdf(title, headers, rows) {
  const lineHeight = 13;
  let y = 780;
  const esc = (v) =>
    String(v ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  const commands = [
    `BT /F1 16 Tf 50 ${y} Td (${esc(title)}) Tj ET`,
  ];
  y -= 28;
  commands.push(`BT /F1 10 Tf 50 ${y} Td (${esc(headers.join(' | '))}) Tj ET`);
  for (const row of rows) {
    y -= lineHeight;
    if (y < 40) break;
    commands.push(`BT /F1 9 Tf 50 ${y} Td (${esc(row.join(' | '))}) Tj ET`);
  }
  const stream = commands.join('\n');
  const streamLength = Buffer.byteLength(stream, 'utf8');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function listGamingTransactions({ search = '', startDate = '', endDate = '' } = {}) {
  const pool = getPool();
  const filters = [];
  const params = [];

  const term = String(search || '').trim();
  if (term) {
    filters.push(`(
      gt.username LIKE ? OR gt.transaction_id LIKE ? OR gt.provider_code LIKE ?
      OR gt.game_code LIKE ? OR CAST(gt.user_id AS CHAR) LIKE ?
    )`);
    const like = `%${term}%`;
    params.push(like, like, like, like, like);
  }

  if (startDate) {
    filters.push('DATE(gt.created_at) >= ?');
    params.push(startDate);
  }

  if (endDate) {
    filters.push('DATE(gt.created_at) <= ?');
    params.push(endDate);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT gt.id, gt.user_id, gt.username, gt.account_id, gt.provider_code, gt.game_code,
            gt.amount, gt.bet_type, gt.transaction_id, gt.status, gt.created_at,
            u.name AS user_name
     FROM gaming_transactions gt
     LEFT JOIN users u ON u.id = gt.user_id
     ${where}
     ORDER BY gt.created_at DESC
     LIMIT 500`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userName: row.user_name || row.username,
    accountId: row.account_id,
    providerCode: row.provider_code,
    gameCode: row.game_code,
    amount: Number(row.amount),
    betType: row.bet_type,
    transactionId: row.transaction_id,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function exportGamingTransactionsCsv(filters = {}) {
  const rows = await listGamingTransactions(filters);
  const headers = ['Date', 'Username', 'Provider', 'Game', 'Type', 'Amount', 'Transaction ID', 'Status'];
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) =>
      [
        new Date(row.createdAt).toLocaleString(),
        row.username,
        row.providerCode,
        row.gameCode,
        row.betType,
        row.amount.toFixed(2),
        row.transactionId,
        row.status,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ];
  return { filename: 'gaming-transactions.csv', content: `\uFEFF${lines.join('\n')}` };
}

export async function exportGamingTransactionsPdf(filters = {}) {
  const rows = await listGamingTransactions(filters);
  const headers = ['Date', 'User', 'Type', 'Amount', 'Tx ID', 'Status'];
  const body = rows.slice(0, 40).map((row) => [
    new Date(row.createdAt).toLocaleDateString(),
    row.username,
    row.betType,
    row.amount.toFixed(2),
    row.transactionId,
    row.status,
  ]);
  return {
    filename: 'gaming-transactions.pdf',
    content: buildSimplePdf('Gaming Transactions', headers, body),
  };
}

export async function getPublicGamingGatewayStatus() {
  const settings = await getGamingGatewaySettingsForAdmin();
  return {
    active: settings.providerStatus === 'active',
    gamesEnabled: settings.providerStatus === 'active',
    providerName: settings.providerName,
    apiMode: settings.apiMode,
    currency: settings.currency,
  };
}

export default {
  migrateGamingGatewaySchema,
  isGamingGatewayActive,
  getGamingGatewaySettingsForAdmin,
  getGamingGatewaySettingsInternal,
  updateGamingGatewaySettings,
  setGamingGatewayStatus,
  testGamingGatewayConnection,
  testGamingGameLaunch,
  launchOracleGameSession,
  recordOracleLaunchSession,
  processOracleCallback,
  processOracleRefund,
  buildCallbackError,
  listGamingTransactions,
  exportGamingTransactionsCsv,
  exportGamingTransactionsPdf,
  getPublicGamingGatewayStatus,
  fetchOracleGameCatalog,
};
