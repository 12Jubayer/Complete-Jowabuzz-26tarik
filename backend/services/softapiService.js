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
} from './affiliateBalanceService.js'
import { buildSoftApiLaunchQuery, maskSoftApiSecret, validateSoftApiSecret } from './softapiCryptoService.js';
import { resolveHmkLaunchGameUid } from './hmkApiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function trim(value) {
  return String(value ?? '').trim();
}

export function isSoftApiProvider(provider = {}) {
  const code = trim(provider.code || provider.provider_code).toUpperCase();
  const adapter = trim(provider.adapter_key).toLowerCase();
  const configuredProvider = trim(process.env.SOFTAPI_PROVIDER || 'SDR').toUpperCase();
  return adapter === 'softapi' || code === 'SDR' || code === configuredProvider;
}

export function isSoftApiConfigured() {
  const token = trim(process.env.SOFTAPI_TOKEN);
  const secret = trim(process.env.SOFTAPI_SECRET);
  const callbackUrl = trim(process.env.SOFTAPI_CALLBACK_URL);
  return Boolean(token && secret.length === 32 && callbackUrl);
}

export function getSoftApiConfig() {
  const token = trim(process.env.SOFTAPI_TOKEN);
  const secret = trim(process.env.SOFTAPI_SECRET);
  const baseUrl = trim(process.env.SOFTAPI_BASE_URL) || 'https://767fafapi.live/api/v1';
  const callbackUrl = trim(process.env.SOFTAPI_CALLBACK_URL);
  const returnUrl = trim(process.env.SOFTAPI_RETURN_URL);
  const currency = trim(process.env.SOFTAPI_CURRENCY) || 'BDT';
  const language = trim(process.env.SOFTAPI_LANGUAGE) || 'bn';
  const env = trim(process.env.SOFTAPI_ENV) || 'test';
  const providerCode = trim(process.env.SOFTAPI_PROVIDER || 'SDR').toUpperCase();

  validateSoftApiSecret(secret);

  if (!token) {
    const error = new Error('SOFTAPI_TOKEN is not configured');
    error.statusCode = 500;
    error.code = 'SOFTAPI_TOKEN_MISSING';
    throw error;
  }

  if (!callbackUrl) {
    const error = new Error('SOFTAPI_CALLBACK_URL is not configured');
    error.statusCode = 500;
    error.code = 'SOFTAPI_CALLBACK_URL_MISSING';
    throw error;
  }

  return {
    token,
    secret,
    baseUrl: baseUrl.replace(/\/$/, ''),
    callbackUrl,
    returnUrl,
    currency,
    language,
    env,
    providerCode,
  };
}

export function getSoftApiPublicStatus() {
  const configured = isSoftApiConfigured();
  let baseUrl = trim(process.env.SOFTAPI_BASE_URL) || 'https://767fafapi.live/api/v1';
  baseUrl = baseUrl.replace(/\/$/, '');

  return {
    provider: 'SOFTAPI',
    code: trim(process.env.SOFTAPI_PROVIDER || 'SDR').toUpperCase(),
    env: trim(process.env.SOFTAPI_ENV) || 'test',
    baseUrl,
    currency: trim(process.env.SOFTAPI_CURRENCY) || 'BDT',
    language: trim(process.env.SOFTAPI_LANGUAGE) || 'bn',
    callbackUrl: trim(process.env.SOFTAPI_CALLBACK_URL) || null,
    returnUrl: trim(process.env.SOFTAPI_RETURN_URL) || null,
    token: maskSoftApiSecret(process.env.SOFTAPI_TOKEN),
    secret: maskSoftApiSecret(process.env.SOFTAPI_SECRET),
    status: configured ? 'configured' : 'missing_configuration',
  };
}

async function runSqlFile(relativePath) {
  const pool = getPool();
  const sqlPath = path.join(__dirname, '..', 'sql', relativePath);
  if (!fs.existsSync(sqlPath)) return;
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function migrateSoftApiSchema() {
  await runSqlFile('softapi_game_transactions.sql');
  await runSqlFile('softapi_provider_seed.sql');
}

async function insertGamingTransaction(connection, {
  userId,
  username,
  providerCode,
  gameCode,
  amount,
  betType,
  transactionId,
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
      null,
      providerCode,
      gameCode,
      amount,
      betType,
      transactionId,
      null,
      status,
      JSON.stringify(rawPayload || null),
    ],
  );
}

export async function launchSoftApiGameSession({ user, game, sessionToken, launchBalance }) {
  const config = getSoftApiConfig();
  const memberAccount = String(user.id);
  const gameUid = await resolveHmkLaunchGameUid(game);
  const balance = normalizeLaunchBalance(launchBalance);

  if (!gameUid) {
    const error = new Error('Game code is required for SoftAPI launch');
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    user_id: memberAccount,
    balance,
    money: balance,
    amount: balance,
    game_uid: gameUid,
    token: config.token,
    timestamp: Date.now(),
    return: config.returnUrl || `${trim(process.env.PUBLIC_SITE_URL) || 'https://jowabuzz.com'}/game/return`,
    callback: config.callbackUrl,
    currency_code: config.currency,
    language: config.language,
  };

  const query = buildSoftApiLaunchQuery(payload, config.secret, config.token);
  const requestUrl = `${config.baseUrl}?${query}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || body?.code !== 0 || !body?.data?.url) {
      console.error('[SoftAPI Launch] failed', {
        userId: user.id,
        gameUid,
        status: response.status,
        code: body?.code,
        msg: body?.msg,
      });
      const error = new Error(body?.msg || 'Unable to launch game. Please try again.');
      error.statusCode = 502;
      throw error;
    }

    console.log('[SoftAPI Launch] success', {
      userId: user.id,
      gameUid,
      provider: config.providerCode,
    });

    return {
      launchUrl: body.data.url,
      sessionToken,
      provider: 'SoftAPI',
      mode: config.env,
      userId: user.id,
      username: memberAccount,
      balance,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('SoftAPI launch timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function launchSoftApiGameForUser(userId, gameUid) {
  const pool = getPool();
  const numericUserId = Number(userId);
  const normalizedGameUid = trim(gameUid);

  if (!numericUserId || !normalizedGameUid) {
    const error = new Error('game_uid is required');
    error.statusCode = 400;
    throw error;
  }

  const [[user]] = await pool.query(
    `SELECT id, balance, status FROM users WHERE id = ? LIMIT 1`,
    [numericUserId],
  );

  if (!user || user.status !== 'active') {
    const error = new Error('User account is not active');
    error.statusCode = 403;
    throw error;
  }

  const [[game]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.provider_id, p.code AS provider_code, p.adapter_key
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.code = ? AND p.code = ?
     LIMIT 1`,
    [normalizedGameUid, getSoftApiPublicStatus().code],
  );

  if (!game) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  await syncAllWalletBalances(numericUserId);
  const launchBalance = await getAuthoritativeWalletBalance(numericUserId);
  const sessionToken = crypto.randomBytes(24).toString('hex');

  const providerPayload = await launchSoftApiGameSession({
    user,
    game,
    sessionToken,
    launchBalance,
  });

  return {
    success: true,
    url: providerPayload.launchUrl,
    sessionToken,
  };
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
    `UPDATE softapi_game_transactions
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

export async function processSoftApiCallback(rawPayload = {}) {
  const gameRound = trim(rawPayload.game_round);
  const memberAccount = trim(rawPayload.member_account);
  const gameUid = trim(rawPayload.game_uid);
  const responseTimestamp = Date.now();
  const userId = Number(memberAccount);

  if (memberAccount && isBalanceInquiry(rawPayload)) {
    if (!userId) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    await syncAllWalletBalances(userId);
    const balance = await getAuthoritativeWalletBalance(userId);
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
  const config = getSoftApiPublicStatus();
  const transactionId = `SDR_${gameRound}`;

  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT id, credit_amount, bet_amount, win_amount
       FROM softapi_game_transactions
       WHERE game_round = ?
       LIMIT 1
       FOR UPDATE`,
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

    if (betAmount > 0 && balanceBefore < betAmount) {
      await connection.query(
        `INSERT INTO softapi_game_transactions
           (user_id, member_account, provider, provider_code, game_uid, game_round,
            bet_amount, win_amount, credit_amount, balance_before, balance_after,
            currency, status, raw_payload)
         VALUES (?, ?, 'SOFTAPI', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)`,
        [
          userId,
          memberAccount,
          config.code,
          gameUid,
          gameRound,
          betAmount,
          winAmount,
          creditAmount,
          balanceBefore,
          balanceBefore,
          config.currency,
          JSON.stringify(rawPayload),
        ],
      );
      const error = new Error('Insufficient balance');
      error.statusCode = 400;
      throw error;
    }

    const netDelta = winAmount - betAmount;
    const balanceAfter = await applyBalanceDelta(connection, userId, netDelta);

    await connection.query(
      `INSERT INTO softapi_game_transactions
         (user_id, member_account, provider, provider_code, game_uid, game_round,
          bet_amount, win_amount, credit_amount, balance_before, balance_after,
          currency, status, raw_payload)
       VALUES (?, ?, 'SOFTAPI', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', ?)`,
      [
        userId,
        memberAccount,
        config.code,
        gameUid,
        gameRound,
        betAmount,
        winAmount,
        creditAmount,
        balanceBefore,
        balanceAfter,
        config.currency,
        JSON.stringify(rawPayload),
      ],
    );

    try {
      await insertGamingTransaction(connection, {
        userId,
        username: memberAccount,
        providerCode: config.code,
        gameCode: gameUid,
        amount: Math.abs(netDelta),
        betType: 'ROUND',
        transactionId,
        status: 'completed',
        rawPayload: {
          ...rawPayload,
          provider: 'SOFTAPI',
          net_delta: netDelta,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
      });
    } catch (gamingTxError) {
      if (gamingTxError?.code !== 'ER_DUP_ENTRY') {
        throw gamingTxError;
      }
    }

    if (betAmount > 0) {
      await connection.query(
        `UPDATE user_wallets
         SET completed_turnover = completed_turnover + ?
         WHERE user_id = ?`,
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

    console.log('[SoftAPI Callback] processed', {
      userId,
      gameRound,
      betAmount,
      winAmount,
      balanceAfter,
    });

    return buildCallbackResponse(betAmount, winAmount, balanceAfter, responseTimestamp);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  isSoftApiProvider,
  isSoftApiConfigured,
  getSoftApiConfig,
  getSoftApiPublicStatus,
  migrateSoftApiSchema,
  launchSoftApiGameSession,
  launchSoftApiGameForUser,
  processSoftApiCallback,
};
