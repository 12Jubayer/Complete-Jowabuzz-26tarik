import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta, getWalletBalance, getAuthoritativeWalletBalance, normalizeLaunchBalance, syncAllWalletBalances } from './gameWalletService.js';
import { applyBonusClaimTurnover } from './bonusTurnoverService.js';
import { applyDepositBonusTurnover } from './depositBonusService.js';
import { processUserVipProgress } from './vipLevelService.js';
import {
  settleOracleBetForAffiliate,
  trackOracleBetForAffiliate,
} from './affiliateBalanceService.js';
import { buildHmkLaunchQuery, maskHmkSecret, validateHmkSecret } from './hmkCryptoService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REQUEST_TIMEOUT_MS = Number(process.env.HMK_REQUEST_TIMEOUT_MS || 20000);
const MAX_RETRIES = Number(process.env.HMK_MAX_RETRIES || 2);

function trim(value) {
  return String(value ?? '').trim();
}

function logHmk(event, data = {}) {
  const safe = { ...data };
  if (safe.token) safe.token = maskHmkSecret(safe.token);
  if (safe.secret) safe.secret = maskHmkSecret(safe.secret);
  console.log('[HMK]', JSON.stringify({ ts: new Date().toISOString(), event, ...safe }));
}

export function isOracleDisabled() {
  return (
    trim(process.env.ORACLE_ENABLED).toLowerCase() === 'false' ||
    trim(process.env.ORACLE_DISABLED).toLowerCase() === 'true' ||
    trim(process.env.HMK_PRIMARY_PROVIDER).toLowerCase() === 'true'
  );
}

export function isHmkProvider(provider = {}) {
  const code = trim(provider.code || provider.provider_code).toUpperCase();
  const adapter = trim(provider.adapter_key).toLowerCase();
  const configured = trim(process.env.HMK_CODE || 'HMK').toUpperCase();
  return adapter === 'hmk' || code === 'HMK' || code === configured;
}

export function isHmkConfigured() {
  try {
    const token = trim(process.env.HMK_TOKEN);
    const secret = trim(process.env.HMK_SECRET);
    const callbackUrl = trim(process.env.HMK_CALLBACK_URL);
    if (!token || secret.length !== 32 || !callbackUrl) return false;
    validateHmkSecret(secret);
    return true;
  } catch {
    return false;
  }
}

export function shouldUseHmkForAllGames() {
  if (!isHmkConfigured()) return false;
  const launchAll = trim(process.env.HMK_LAUNCH_ALL_GAMES).toLowerCase();
  if (launchAll === 'false') return false;
  if (launchAll === 'true') return true;
  return (
    trim(process.env.HMK_PRIMARY_PROVIDER).toLowerCase() === 'true' ||
    isOracleDisabled()
  );
}

export async function isGamesPlayEnabled() {
  if (isHmkConfigured()) return true;
  const { isSoftApiConfigured } = await import('./softapiService.js');
  if (isSoftApiConfigured()) return true;
  const { isGamingGatewayActive } = await import('./gamingGatewayService.js');
  return isGamingGatewayActive();
}

export function getHmkConfig() {
  const baseUrl = (trim(process.env.HMK_API_URL) || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
  const token = trim(process.env.HMK_TOKEN);
  const secret = trim(process.env.HMK_SECRET);
  const providerCode = trim(process.env.HMK_CODE || 'HMK').toUpperCase();
  const currency = trim(process.env.HMK_CURRENCY) || 'BDT';
  const language = trim(process.env.HMK_LANGUAGE) || 'en';
  const username = trim(process.env.HMK_USERNAME);
  const publicBase =
    trim(process.env.PUBLIC_APP_URL) || trim(process.env.PUBLIC_SITE_URL) || 'https://jowabuzz.com';
  const allowedDomains = trim(process.env.HMK_ALLOWED_DOMAINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  validateHmkSecret(secret);

  if (!token) {
    const error = new Error('HMK_TOKEN is not configured');
    error.statusCode = 500;
    throw error;
  }

  const callbackUrl = trim(process.env.HMK_CALLBACK_URL) || `${publicBase}/api/hmk/callback`;
  const returnUrl = trim(process.env.HMK_RETURN_URL) || `${publicBase}/game/return`;

  return {
    baseUrl,
    token,
    secret,
    providerCode,
    currency,
    language,
    username,
    callbackUrl,
    returnUrl,
    allowedDomains,
    domainWhitelistPending: allowedDomains.length === 0,
  };
}

export function getHmkPublicStatus() {
  let configured = false;
  try {
    configured = isHmkConfigured();
  } catch {
    configured = false;
  }
  const cfg = (() => {
    try {
      return getHmkConfig();
    } catch {
      return null;
    }
  })();

  return {
    provider: 'HMK',
    code: trim(process.env.HMK_CODE || 'HMK').toUpperCase(),
    apiUrl: trim(process.env.HMK_API_URL) || 'https://767fafapi.live/api/v1',
    currency: trim(process.env.HMK_CURRENCY) || 'BDT',
    username: cfg?.username ? maskHmkSecret(cfg.username) : null,
    callbackUrl: cfg?.callbackUrl || null,
    returnUrl: cfg?.returnUrl || null,
    domainWhitelistPending: cfg?.domainWhitelistPending ?? true,
    oracleDisabled: isOracleDisabled(),
    token: maskHmkSecret(process.env.HMK_TOKEN),
    secret: maskHmkSecret(process.env.HMK_SECRET),
    status: configured ? 'configured' : 'missing_configuration',
  };
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  if (lastError?.name === 'AbortError') {
    const err = new Error('HMK API request timed out');
    err.statusCode = 504;
    throw err;
  }
  throw lastError;
}

export async function migrateHmkSchema() {
  const pool = getPool();
  for (const file of ['hmk_game_transactions.sql', 'hmk_provider_seed.sql']) {
    const sqlPath = path.join(__dirname, '..', 'sql', file);
    if (!fs.existsSync(sqlPath)) continue;
    const sql = fs.readFileSync(sqlPath, 'utf8');
    for (const statement of sql.split(';').map((p) => p.trim()).filter(Boolean)) {
      await pool.query(statement);
    }
  }
}

const HMK_PROVIDER_LOOKUP_ALIASES = {
  JILIS: 'JILI',
  JKSO: 'JOKER',
  SADSO: 'SA',
  SBOS: 'SBO',
  TBC: '2BC',
};

const HMK_SPORTS_PROVIDER_UID = {
  LUCKYSPORTS: 'LUCKYSPORTS',
  LUCKY: 'LUCKYSPORTS',
  SABA: 'SABA',
  SBOS: 'SBOS',
  SBO: 'SBOS',
  TBC: 'TBC',
  '2BC': 'TBC',
  WS: 'WS',
  '9W': '9W',
  '9WICKET': '9W',
};

const HMK_SPORTS_KNOWN_HEX = {
  '9W': '48341a3bf62b6dd0814d7129e7e0834b',
  '9WICKET': '48341a3bf62b6dd0814d7129e7e0834b',
};

function getHmk9WGameUid() {
  return trim(process.env.HMK_9W_GAME_UID || process.env.HMK_9WICKET_GAME_UID);
}

function is9WicketSportsProvider(providerCode = '') {
  const code = trim(providerCode).toUpperCase();
  return code === '9W' || code === '9WICKET';
}

async function resolveSportsLaunchHexUid(game = {}) {
  const providerCode = trim(game.provider_code || game.providerCode).toUpperCase();
  const knownHex = HMK_SPORTS_KNOWN_HEX[providerCode];
  if (knownHex) return knownHex;

  try {
    const { getGamingGatewaySettingsInternal } = await import('./gamingGatewayService.js');
    const { resolveGameUidForLaunch } = await import('./oracleGamingApiService.js');
    const settings = await getGamingGatewaySettingsInternal();
    if (!settings?.dataKey && !trim(process.env.ORACLE_GAMING_DATA_KEY)) {
      return null;
    }

    const hex = await resolveGameUidForLaunch(settings, {
      providerCode: trim(game.provider_code || game.providerCode),
      gameCode: trim(game.code),
      gameName: trim(game.name || game.title),
    });

    if (hex && /^[a-f0-9]{32}$/i.test(hex)) {
      return hex;
    }
  } catch (error) {
    logHmk('sports_hex_uid_failed', {
      providerCode: trim(game.provider_code || game.providerCode),
      gameCode: trim(game.code),
      message: error.message,
    });
  }

  return null;
}

function isOracleOnlyUid(value) {
  return /^[a-f0-9]{32}$/i.test(trim(value));
}

function isHmkLaunchUid(value) {
  const code = trim(value);
  if (!code || code === '0' || isOracleOnlyUid(code)) return false;
  return true;
}

function isAmbiguousHmkGameCode(code) {
  const value = trim(code);
  if (!value || value === '0') return true;
  if (/^\d{1,3}$/.test(value)) return true;
  return false;
}

const HMK_CATALOG_CACHE = new Map();
const HMK_CATALOG_TTL_MS = 5 * 60 * 1000;

function getCachedProviderGames(providerCode) {
  const key = trim(providerCode).toUpperCase();
  const cached = HMK_CATALOG_CACHE.get(key);
  if (cached && Date.now() - cached.at < HMK_CATALOG_TTL_MS) {
    return cached.games;
  }
  return null;
}

function setCachedProviderGames(providerCode, games) {
  HMK_CATALOG_CACHE.set(trim(providerCode).toUpperCase(), {
    at: Date.now(),
    games: games || [],
  });
}

function scoreCatalogMatch(row, { needle, nameNeedle }) {
  const legacy = trim(row.legacyCode || row.code).toLowerCase();
  const uid = trim(row.gameUid || row.code).toLowerCase();
  const name = trim(row.name).toLowerCase();
  let score = 0;

  if (needle && legacy === needle) score += 100;
  if (needle && uid === needle) score += 90;
  if (nameNeedle && name === nameNeedle) score += 80;
  if (nameNeedle && name.includes(nameNeedle)) score += 40;

  return score;
}

function pickBestCatalogMatch(games, { needle, nameNeedle }) {
  let best = null;
  let bestScore = 0;

  for (const row of games || []) {
    const score = scoreCatalogMatch(row, { needle, nameNeedle });
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore > 0 ? best : null;
}

function pickHmkUidFromCatalogGame(game) {
  if (!game) return null;
  const candidates = [
    trim(game.legacyCode),
    trim(game.code),
  ].filter(isHmkLaunchUid);

  const preferred = candidates.find((candidate) => !isAmbiguousHmkGameCode(candidate));
  if (preferred) return preferred;

  return candidates[0] || null;
}

async function fetchProviderCatalogGames(settings, providerCode) {
  const code = trim(providerCode).toUpperCase();
  if (!code) return [];

  const cached = getCachedProviderGames(code);
  if (cached) return cached;

  const { getProviderByCode } = await import('./oracleGamingApiService.js');
  const result = await getProviderByCode(settings, code);
  const games = result.games || [];
  setCachedProviderGames(code, games);
  return games;
}

async function lookupCatalogGameUid({ providerCode, gameCode, gameName }) {
  if (isOracleDisabled()) {
    return null;
  }

  try {
    const { getGamingGatewaySettingsInternal } = await import('./gamingGatewayService.js');
    const settings = await getGamingGatewaySettingsInternal();
    if (!settings?.dataKey && !trim(process.env.ORACLE_GAMING_DATA_KEY)) {
      return null;
    }

    const providerCandidates = [
      trim(providerCode).toUpperCase(),
      HMK_PROVIDER_LOOKUP_ALIASES[trim(providerCode).toUpperCase()],
    ].filter(Boolean);

    const needle = trim(gameCode).toLowerCase();
    const nameNeedle = trim(gameName).toLowerCase();

    for (const provider of [...new Set(providerCandidates)]) {
      try {
        const games = await fetchProviderCatalogGames(settings, provider);
        const match = pickBestCatalogMatch(games, { needle, nameNeedle });
        const uid = pickHmkUidFromCatalogGame(match);
        if (uid) return uid;
      } catch {
        // try next provider alias
      }
    }
  } catch (error) {
    logHmk('catalog_uid_lookup_failed', { providerCode, gameCode, message: error.message });
  }

  return null;
}

async function buildHmkLaunchUidCandidates(game = {}) {
  const gameCode = trim(game.code);
  const providerCode = trim(game.provider_code || game.providerCode).toUpperCase();
  const gameName = trim(game.name || game.title);
  const category = trim(game.category || game.game_type).toLowerCase();
  const isSports = category === 'sports' || trim(game.game_type).toUpperCase() === 'SPORTS';

  const candidates = [];
  const seen = new Set();
  const add = (value) => {
    const uid = trim(value);
    if (!isHmkLaunchUid(uid) || seen.has(uid)) return;
    seen.add(uid);
    candidates.push(uid);
  };
  const addSportsUid = (value) => {
    const uid = trim(value);
    if (!uid || uid === '0' || seen.has(uid)) return;
    const isHexUid = /^[a-f0-9]{32}$/i.test(uid);
    if (!isHexUid && !isHmkLaunchUid(uid)) return;
    seen.add(uid);
    candidates.push(uid);
  };

  if (isSports) {
    if (is9WicketSportsProvider(providerCode)) {
      addSportsUid(getHmk9WGameUid());
      addSportsUid(HMK_SPORTS_PROVIDER_UID[providerCode]);
      addSportsUid(gameCode);
      addSportsUid(await resolveSportsLaunchHexUid(game));
      return candidates;
    }

    const sportsHex = await resolveSportsLaunchHexUid(game);
    addSportsUid(sportsHex);

    if (game.id !== undefined && game.id !== null && Number(game.id) > 0) {
      addSportsUid(String(game.id));
    }

    if (isAmbiguousHmkGameCode(gameCode)) {
      addSportsUid(HMK_SPORTS_PROVIDER_UID[providerCode]);
    }

    addSportsUid(gameCode);
    return candidates;
  }

  add(gameCode);

  const catalogUid = await lookupCatalogGameUid({ providerCode, gameCode, gameName });
  add(catalogUid);

  add(providerCode);

  return candidates;
}

export async function resolveHmkLaunchGameUid(game = {}) {
  const candidates = await buildHmkLaunchUidCandidates(game);
  return candidates[0] || trim(game.code) || trim(game.provider_code || game.providerCode);
}

function isHmkLaunchHardFail(body = {}) {
  const msg = String(body?.msg || body?.message || '').toLowerCase();
  return msg.includes('not currently supported') || msg.includes('contact customer service');
}

function isHmkLaunchUnavailable(body = {}, status = 0) {
  const msg = String(body?.msg || body?.message || '').toLowerCase();
  return (
    status === 404
    || msg.includes('not available')
    || msg.includes('game not found')
    || msg.includes('invalid game')
  );
}

async function requestHmkLaunch(config, payload) {
  const query = buildHmkLaunchQuery(payload, config.secret, config.token);
  const requestUrl = `${config.baseUrl}?${query}`;
  const response = await fetchWithRetry(requestUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body, requestUrl };
}

export async function launchHmkGameSession({ user, game, sessionToken, launchBalance }) {
  const config = getHmkConfig();
  const memberAccount = String(user.id);
  const balance = normalizeLaunchBalance(launchBalance);
  const uidCandidates = await buildHmkLaunchUidCandidates(game);

  if (!uidCandidates.length) {
    const error = new Error('Game code is required for HMK launch');
    error.statusCode = 400;
    throw error;
  }

  let lastError = null;
  let hardFailError = null;

  for (const gameUid of uidCandidates) {
    if (gameUid !== trim(game.code)) {
      logHmk('launch_uid_try', {
        userId: user.id,
        gameId: game.id,
        fromCode: trim(game.code),
        resolvedUid: gameUid,
        provider: trim(game.provider_code || game.providerCode).toUpperCase(),
      });
    }

    const payload = {
      user_id: memberAccount,
      balance,
      money: balance,
      amount: balance,
      game_uid: gameUid,
      token: config.token,
      timestamp: Date.now(),
      return: config.returnUrl,
      callback: config.callbackUrl,
      currency_code: config.currency,
      language: config.language,
    };

    logHmk('launch_request', { userId: user.id, gameUid, balance, provider: config.providerCode });

    const { response, body } = await requestHmkLaunch(config, payload);

    if (response.ok && body?.code === 0 && body?.data?.url) {
      logHmk('launch_success', { userId: user.id, gameUid });
      return {
        launchUrl: body.data.url,
        sessionToken,
        provider: 'HMK',
        userId: user.id,
        username: memberAccount,
        balance,
      };
    }

    logHmk('launch_failed', {
      userId: user.id,
      gameUid,
      status: response.status,
      code: body?.code,
      msg: body?.msg,
    });

    const error = new Error(body?.msg || 'Unable to launch game. Please try again.');
    error.statusCode = 502;
    lastError = error;

    if (isHmkLaunchHardFail(body)) {
      hardFailError = error;
      continue;
    }

    if (!isHmkLaunchUnavailable(body, response.status)) {
      throw error;
    }
  }

  throw hardFailError || lastError || new Error('Unable to launch game. Please try again.');
}

function normalizeCallbackAmounts(payload = {}) {
  const betAmount = Number(payload.bet_amount ?? 0);
  const winAmount = Number(payload.win_amount ?? 0);
  if (!Number.isFinite(betAmount) || betAmount < 0) {
    const error = new Error('Invalid bet_amount');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(winAmount) || winAmount < 0) {
    const error = new Error('Invalid win_amount');
    error.statusCode = 400;
    throw error;
  }
  return { betAmount, winAmount };
}

function buildCallbackResponse(betAmount, winAmount, balanceAfter, timestamp = Date.now()) {
  const balance = normalizeLaunchBalance(balanceAfter);
  return {
    credit_amount: balance,
    balance,
    money: balance,
    user_balance: balance,
    timestamp,
  };
}

function isBalanceInquiry(payload = {}) {
  const action = trim(payload.action || payload.type || payload.bet_type).toLowerCase();
  if (['balance', 'getbalance', 'get_balance', 'wallet', 'sync_balance'].includes(action)) {
    return true;
  }

  const betAmount = Number(payload.bet_amount ?? 0);
  const winAmount = Number(payload.win_amount ?? 0);
  if (!Number.isFinite(betAmount) || betAmount < 0) return false;
  if (!Number.isFinite(winAmount) || winAmount < 0) return false;

  return betAmount === 0 && winAmount === 0;
}

function resolveCallbackStatus(payload = {}) {
  const action = trim(payload.action || payload.type || payload.bet_type).toLowerCase();
  if (['refund', 'rollback', 'cancel'].includes(action)) return action;
  return 'processed';
}

async function applyExistingRoundUpdate(connection, {
  existing,
  userId,
  gameRound,
  betAmount,
  winAmount,
  rawPayload,
  config,
  memberAccount,
  gameUid,
  transactionId,
}) {
  const prevBet = Number(existing.bet_amount || 0);
  const prevWin = Number(existing.win_amount || 0);
  const nextBet = Math.max(prevBet, betAmount);
  const nextWin = Math.max(prevWin, winAmount);
  const extraBet = Math.max(0, nextBet - prevBet);
  const extraWin = Math.max(0, nextWin - prevWin);
  const extraDelta = extraWin - extraBet;

  if (extraDelta === 0 && nextBet === prevBet && nextWin === prevWin) {
    return null;
  }

  const balanceAfter = extraDelta !== 0
    ? await applyBalanceDelta(connection, userId, extraDelta)
    : await getAuthoritativeWalletBalance(userId, connection);

  await connection.query(
    `UPDATE hmk_game_transactions
     SET bet_amount = ?, win_amount = ?, credit_amount = ?, balance_after = ?, raw_payload = ?, status = 'processed'
     WHERE game_round = ?`,
    [
      nextBet,
      nextWin,
      Math.max(0, nextBet - nextWin),
      balanceAfter,
      JSON.stringify(rawPayload),
      gameRound,
    ],
  );

  if (extraBet > 0) {
    await connection.query(
      `UPDATE user_wallets SET completed_turnover = completed_turnover + ? WHERE user_id = ?`,
      [extraBet, userId],
    );
    await applyBonusClaimTurnover(connection, userId, extraBet);
    await applyDepositBonusTurnover(connection, userId, extraBet);
    await trackOracleBetForAffiliate(userId, extraBet, transactionId, connection);
    await processUserVipProgress(userId, connection, { betAmount: extraBet });
  }

  if (extraWin > 0) {
    await settleOracleBetForAffiliate(userId, extraWin, connection);
  }

  return { balanceAfter, nextBet, nextWin };
}

export function verifyHmkCallbackSignature(req, rawBody = '') {
  const expectedToken = trim(process.env.HMK_TOKEN);
  const headerToken =
    trim(req?.headers?.['x-api-token']) ||
    trim(req?.headers?.['x-hmk-token']) ||
    trim(req?.body?.token);
  if (headerToken && expectedToken && headerToken !== expectedToken) {
    return false;
  }
  const sign = trim(req?.headers?.['x-signature'] || req?.headers?.['x-callback-sign']);
  const secret = trim(process.env.HMK_SECRET);
  if (sign && secret && rawBody) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return sign === expected;
  }
  return true;
}

export async function processHmkCallback(rawPayload = {}, options = {}) {
  const gameRound = trim(rawPayload.game_round || rawPayload.round_id || rawPayload.transaction_id);
  const memberAccount = trim(rawPayload.member_account || rawPayload.user_id);
  const gameUid = trim(rawPayload.game_uid || rawPayload.game_id);
  const responseTimestamp = Date.now();
  const callbackStatus = resolveCallbackStatus(rawPayload);
  const userId = Number(memberAccount);

  if (memberAccount && isBalanceInquiry(rawPayload)) {
    if (!userId) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    await syncAllWalletBalances(userId);
    const balance = await getAuthoritativeWalletBalance(userId);
    logHmk('balance_inquiry', { userId, balance });
    return buildCallbackResponse(0, 0, balance, responseTimestamp);
  }

  if (!gameRound || !memberAccount) {
    const error = new Error('Missing required callback fields');
    error.statusCode = 400;
    throw error;
  }

  const { betAmount, winAmount } = normalizeCallbackAmounts(rawPayload);
  const creditAmount = Math.max(0, betAmount - winAmount);

  if (!userId) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  const config = getHmkConfig();
  const transactionId = `HMK_${gameRound}`;

  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT id, bet_amount, win_amount, status FROM hmk_game_transactions WHERE game_round = ? LIMIT 1 FOR UPDATE`,
      [gameRound],
    );

    if (existing) {
      const roundUpdate = await applyExistingRoundUpdate(connection, {
        existing,
        userId,
        gameRound,
        betAmount,
        winAmount,
        rawPayload,
        config,
        memberAccount,
        gameUid,
        transactionId,
      });

      if (roundUpdate) {
        await connection.commit();
        logHmk('callback_round_update', {
          userId,
          gameRound,
          betAmount: roundUpdate.nextBet,
          winAmount: roundUpdate.nextWin,
          balanceAfter: roundUpdate.balanceAfter,
        });
        return buildCallbackResponse(
          roundUpdate.nextBet,
          roundUpdate.nextWin,
          roundUpdate.balanceAfter,
          responseTimestamp,
        );
      }

      const balance = await getAuthoritativeWalletBalance(userId, connection);
      await connection.commit();
      return {
        ...buildCallbackResponse(
          Number(existing.bet_amount),
          Number(existing.win_amount),
          balance,
          responseTimestamp,
        ),
        duplicate: true,
      };
    }

    const [[user]] = await connection.query(
      `SELECT id, balance, status FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
      [userId],
    );

    if (!user || user.status !== 'active') {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const balanceBefore = Number(user.balance ?? 0);
    let netDelta = winAmount - betAmount;

    if (['refund', 'rollback', 'cancel'].includes(callbackStatus)) {
      netDelta = winAmount - betAmount;
    }

    if (betAmount > 0 && balanceBefore < betAmount && callbackStatus === 'processed') {
      await connection.query(
        `INSERT INTO hmk_game_transactions
           (user_id, member_account, provider, provider_code, game_uid, game_round,
            bet_amount, win_amount, credit_amount, balance_before, balance_after,
            currency, status, raw_payload)
         VALUES (?, ?, 'HMK', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)`,
        [
          userId, memberAccount, config.providerCode, gameUid, gameRound,
          betAmount, winAmount, creditAmount, balanceBefore, balanceBefore,
          config.currency, JSON.stringify(rawPayload),
        ],
      );
      const error = new Error('Insufficient balance');
      error.statusCode = 400;
      throw error;
    }

    const balanceAfter = await applyBalanceDelta(connection, userId, netDelta);

    await connection.query(
      `INSERT INTO hmk_game_transactions
         (user_id, member_account, provider, provider_code, game_uid, game_round,
          bet_amount, win_amount, credit_amount, balance_before, balance_after,
          currency, status, raw_payload)
       VALUES (?, ?, 'HMK', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, memberAccount, config.providerCode, gameUid, gameRound,
        betAmount, winAmount, creditAmount, balanceBefore, balanceAfter,
        config.currency, callbackStatus === 'processed' ? 'processed' : callbackStatus,
        JSON.stringify(rawPayload),
      ],
    );

    if (betAmount > 0 && callbackStatus === 'processed') {
      await connection.query(
        `UPDATE user_wallets SET completed_turnover = completed_turnover + ? WHERE user_id = ?`,
        [betAmount, userId],
      );
      await applyBonusClaimTurnover(connection, userId, betAmount);
      await applyDepositBonusTurnover(connection, userId, betAmount);
      await trackOracleBetForAffiliate(userId, betAmount, transactionId, connection);
    }

    if (winAmount > 0) {
      await settleOracleBetForAffiliate(userId, winAmount, connection);
    }

    await processUserVipProgress(userId, connection, { betAmount });
    await connection.commit();

    logHmk('callback_processed', { userId, gameRound, betAmount, winAmount, balanceAfter, callbackStatus });
    return buildCallbackResponse(betAmount, winAmount, balanceAfter, responseTimestamp);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkHmkApiHealth() {
  const config = getHmkConfig();
  try {
    const response = await fetchWithRetry(config.baseUrl, { method: 'GET', headers: { Accept: 'application/json' } }, 0);
    return { ok: response.status < 500, status: response.status, baseUrl: config.baseUrl };
  } catch (error) {
    return { ok: false, error: error.message, baseUrl: config.baseUrl };
  }
}

export default {
  migrateHmkSchema,
  isHmkProvider,
  isHmkConfigured,
  isOracleDisabled,
  shouldUseHmkForAllGames,
  isGamesPlayEnabled,
  getHmkConfig,
  getHmkPublicStatus,
  launchHmkGameSession,
  processHmkCallback,
  verifyHmkCallbackSignature,
  checkHmkApiHealth,
};
