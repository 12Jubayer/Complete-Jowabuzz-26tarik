import crypto from 'crypto';
import { getPool } from '../config/db.js';
import {
  applyBalanceDelta,
  getWalletBalance,
  getAuthoritativeWalletBalance,
  logApiEvent,
  normalizeLaunchBalance,
  syncAllWalletBalances,
} from '../services/gameWalletService.js';
import { applySafeCashback, processUserVipProgress } from '../services/vipLevelService.js';
import { applyBonusClaimTurnover } from '../services/bonusTurnoverService.js';
import { applyDepositBonusTurnover } from '../services/depositBonusService.js';
import { resolveGameImage } from '../services/adminGameImageService.js';
import { launchGameSession, settleGameRound } from '../services/gamingProviderService.js';
import { isGamingGatewayActive, resolveOraclePlayerIdentity } from '../services/gamingApiSettingsService.js';
import { recordOracleLaunchSession } from '../services/gamingGatewayService.js';
import { applyReferralGameProfitLoss } from '../services/affiliateBalanceService.js';
import { isSoftApiProvider } from '../services/softapiService.js';
import { isHmkProvider, shouldUseHmkForAllGames, isGamesPlayEnabled } from '../services/hmkApiService.js';

function getUserId(req) {
  return Number(req.user?.sub);
}

function isSingleSessionProvider(providerCode = '', game = {}) {
  const provider = String(providerCode || '').trim().toUpperCase();
  const name = String(game.name || '').trim().toLowerCase();
  const category = String(game.category || game.game_type || '').trim().toLowerCase();
  return provider === 'SPRIBE' || category === 'crash' || name.includes('aviator');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const inFlightLaunches = new Map();
const launchResponseCache = new Map();
const launchMutex = new Set();
const SPRIBE_LAUNCH_CACHE_MS = 0;  // Spribe tokens are single-use

function buildLaunchGuardKey(userId, gameId) {
  return `${userId}:${gameId}`;
}

function isSpribeLaunchPayload(payload = {}) {
  const code = String(payload?.provider?.code || '').trim().toUpperCase();
  const url = String(payload?.launchUrl || '');
  return code === 'SPRIBE' || url.includes('spribegaming.com');
}

function normalizeSpribeLaunchUrl(url) {
  const raw = String(url || '').trim();
  if (!raw.includes('spribegaming.com')) return raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.set('platform', 'mobile');
    return parsed.toString();
  } catch {
    return raw.replace(/platform=desktop/gi, 'platform=mobile');
  }
}

function decorateSpribeLaunchPayload(payload = {}) {
  if (!isSpribeLaunchPayload(payload)) return payload;
  const launchUrl = normalizeSpribeLaunchUrl(payload.launchUrl);
  return { ...payload, launchUrl, openMode: 'replace' };
}

async function fetchGameAndProvider(pool, gameId, providerId) {
  const numericGameId = Number(gameId);
  const numericProviderId = Number(providerId);

  if (!numericGameId || !numericProviderId) {
    return { error: 'gameId and providerId are required', status: 400 };
  }

  const [[game]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, g.image_url, g.min_bet, g.status, g.is_active, g.provider_id,
            p.id AS provider_id, p.code AS provider_code, p.name AS provider_name, p.adapter_key,
            p.status AS provider_status, p.enabled AS provider_enabled
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.id = ? AND g.provider_id = ?
     LIMIT 1`,
    [numericGameId, numericProviderId],
  );

  if (!game) {
    return { error: 'Game or provider not found', status: 404 };
  }

  const gameActive = game.status === 'active' && (game.is_active === 1 || game.is_active === null);
  const providerActive =
    game.provider_status === 'active' && (game.provider_enabled === 1 || game.provider_enabled === null);

  if (!gameActive || !providerActive) {
    return { error: 'Game is not available', status: 403 };
  }

  return { game };
}

export async function getUserBalance(req, res) {
  const userId = getUserId(req);

  try {
    const wallet = await getWalletBalance(userId);
    if (!wallet) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      balance: wallet.balance,
      currency: wallet.currency,
    });
  } catch (error) {
    console.error('Get user balance error:', error);
    return res.status(500).json({ error: 'Failed to load balance' });
  }
}

export async function startGame(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const requestStartedAt = Date.now();
  const bodyGameId = Number(req.body?.gameId);
  const earlyGuardKey = bodyGameId ? buildLaunchGuardKey(userId, bodyGameId) : '';

  if (earlyGuardKey) {
    const cached = launchResponseCache.get(earlyGuardKey);
    if (cached && Date.now() < cached.expires) {
      const payload = decorateSpribeLaunchPayload(cached.payload);
      if (!isSpribeLaunchPayload(payload)) {
        console.log('[Game Start] cache hit', { userId, gameId: bodyGameId });
        return res.json(payload);
      }
      launchResponseCache.delete(earlyGuardKey);
    }
    if (inFlightLaunches.has(earlyGuardKey)) {
      console.log('[Game Start] await in-flight', { userId, gameId: bodyGameId });
      try {
        return res.json(await inFlightLaunches.get(earlyGuardKey));
      } catch (error) {
        return res.status(error.statusCode || 502).json({
          error: error.message || 'Failed to launch game. Please try again.',
        });
      }
    }
    if (launchMutex.has(earlyGuardKey)) {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await sleep(100);
        const hit = launchResponseCache.get(earlyGuardKey);
        if (hit && Date.now() < hit.expires) {
          const payload = decorateSpribeLaunchPayload(hit.payload);
          if (!isSpribeLaunchPayload(payload)) {
            console.log('[Game Start] cache hit after wait', { userId, gameId: bodyGameId });
            return res.json(payload);
          }
          launchResponseCache.delete(earlyGuardKey);
        }
        if (!launchMutex.has(earlyGuardKey) && !inFlightLaunches.has(earlyGuardKey)) break;
      }
      return res.status(429).json({
        error: 'Game is already opening. Please wait a moment and try again.',
      });
    }
    launchMutex.add(earlyGuardKey);
  }

  let settleLaunch = null;
  const launchSlot = earlyGuardKey
    ? new Promise((resolve, reject) => {
        settleLaunch = { resolve, reject };
      })
    : null;
  if (earlyGuardKey) inFlightLaunches.set(earlyGuardKey, launchSlot);

  const failLaunch = (status, message) => {
    if (settleLaunch) {
      const error = new Error(message);
      error.statusCode = status;
      settleLaunch.reject(error);
      inFlightLaunches.delete(earlyGuardKey);
      launchMutex.delete(earlyGuardKey);
    }
    return res.status(status).json({ error: message });
  };

  const succeedLaunch = (payload, cacheMs = SPRIBE_LAUNCH_CACHE_MS) => {
    if (earlyGuardKey) {
      launchResponseCache.set(earlyGuardKey, {
        payload,
        expires: Date.now() + cacheMs,
      });
      settleLaunch.resolve(payload);
      setTimeout(() => {
        inFlightLaunches.delete(earlyGuardKey);
        launchMutex.delete(earlyGuardKey);
      }, 5000);
    }
    return res.json(payload);
  };

  console.log('[Game Start] request', {
    userId,
    gameId: req.body?.gameId,
    providerId: req.body?.providerId,
  });

  const lookup = await fetchGameAndProvider(pool, req.body.gameId, req.body.providerId);

  if (lookup.error) {
    return failLaunch(lookup.status, lookup.error);
  }

  const { game } = lookup;
  const isHmk = isHmkProvider({ code: game.provider_code, adapter_key: game.adapter_key });
  const isSoftApi = isSoftApiProvider({ code: game.provider_code, adapter_key: game.adapter_key });
  const routeViaHmk = shouldUseHmkForAllGames();
  const usesSeamlessProvider = isHmk || isSoftApi || routeViaHmk;
  const singleSession = isSingleSessionProvider(game.provider_code, game);

  if (!usesSeamlessProvider && !(await isGamesPlayEnabled())) {
    return failLaunch(503, 'Games are temporarily unavailable');
  }

  const [[user]] = await pool.query(
    `SELECT id, name, phone, provider_username, balance, status FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );

  if (!user || user.status !== 'active') {
    return failLaunch(403, 'User account is not active');
  }

  if (singleSession) {
    await pool.query(
      `UPDATE game_sessions
       SET status = 'closed', ended_at = NOW()
       WHERE user_id = ? AND game_id = ? AND status = 'active'`,
      [userId, game.id],
    );
    await sleep(Number(process.env.SPRIBE_LAUNCH_DELAY_MS || 3000));
  }

  const identity = await resolveOraclePlayerIdentity(user);
  await syncAllWalletBalances(userId);
  const launchBalance = await getAuthoritativeWalletBalance(userId);
  const sessionToken = crypto.randomBytes(24).toString('hex');

  console.log('[Game Start] launching', {
    userId,
    playerId: identity.playerId,
    username: identity.username,
    gameCode: game.code,
    providerCode: game.provider_code,
    balance: launchBalance,
    singleSession,
  });

  let providerPayload;
  try {
    providerPayload = await launchGameSession({
      provider: routeViaHmk
        ? { code: 'HMK', adapter_key: 'hmk' }
        : {
            code: game.provider_code,
            adapter_key: game.adapter_key,
          },
      user,
      game,
      sessionToken,
      launchBalance,
    });
  } catch (error) {
    console.error('[Game Start] provider launch failed', {
      userId,
      gameCode: game.code,
      providerCode: game.provider_code,
      message: error.message,
      ms: Date.now() - requestStartedAt,
    });
    return failLaunch(error.statusCode || 502, error.message || 'Failed to launch game. Please try again.');
  }

  const launchUrl = providerPayload?.launchUrl;
  if (!launchUrl) {
    console.error('[Game Start] missing launchUrl', {
      userId,
      gameCode: game.code,
      providerCode: game.provider_code,
      providerPayload,
    });
    return failLaunch(502, 'Game launch URL not received from provider. Please try again.');
  }

  const finalLaunchUrl = singleSession ? normalizeSpribeLaunchUrl(launchUrl) : launchUrl;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sessionResult] = await connection.query(
      `INSERT INTO game_sessions (user_id, game_id, provider_id, status, session_token)
       VALUES (?, ?, ?, 'active', ?)`,
      [userId, game.id, game.provider_id, sessionToken],
    );

    await logApiEvent(connection, {
      userId,
      providerId: game.provider_id,
      endpoint: '/api/game/start',
      method: 'POST',
      requestPayload: {
        ...req.body,
        userId,
        username: identity.username,
        playerId: identity.playerId,
        balance: launchBalance,
      },
      responsePayload: {
        sessionId: sessionResult.insertId,
        balance: launchBalance,
        launchUrl: finalLaunchUrl,
      },
      statusCode: 200,
    });

    await connection.commit();

    if (!usesSeamlessProvider) {
      await recordOracleLaunchSession({
        userId,
        username: identity.username,
        playerId: identity.playerId,
        providerCode: game.provider_code,
        gameCode: game.code,
        sessionToken,
      });
    }

    console.log('[Game Start] success', {
      userId,
      playerId: identity.playerId,
      username: identity.username,
      gameCode: game.code,
      providerCode: game.provider_code,
      launchUrl: String(launchUrl).slice(0, 120),
      ms: Date.now() - requestStartedAt,
      cached: false,
    });

    const cacheMs = singleSession ? 0 : Number(process.env.GAME_LAUNCH_CACHE_MS || 30000);

    return succeedLaunch(decorateSpribeLaunchPayload({
      success: true,
      sessionId: sessionResult.insertId,
      sessionToken,
      userId,
      playerId: identity.playerId,
      username: identity.username,
      game: {
        id: game.id,
        code: game.code,
        name: game.name,
        minBet: Number(game.min_bet),
        gameType: game.game_type || game.category,
      },
      provider: {
        id: game.provider_id,
        code: game.provider_code,
        name: game.provider_name,
      },
      balance: launchBalance,
      launchUrl: finalLaunchUrl,
      launch: providerPayload,
    }), cacheMs);
  } catch (error) {
    await connection.rollback();
    console.error('[Game Start] session persist failed', {
      userId,
      message: error.message,
      ms: Date.now() - requestStartedAt,
    });
    return failLaunch(error.statusCode || 500, error.message || 'Failed to start game session');
  } finally {
    connection.release();
  }
}

export async function submitGameResult(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const sessionId = Number(req.body.sessionId);
  const roundId = String(req.body.roundId || '').trim();
  const betAmount = Number(req.body.betAmount);
  const requestedWinAmount = req.body.winAmount;
  const providerPayload = req.body.providerPayload || {};

  if (!sessionId || !roundId) {
    return res.status(400).json({ error: 'sessionId and roundId are required' });
  }

  if (!betAmount || betAmount <= 0) {
    return res.status(400).json({ error: 'betAmount must be greater than 0' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[existingRound]] = await connection.query(
      `SELECT id, bet_amount, win_amount, net_amount, status
       FROM game_rounds
       WHERE session_id = ? AND round_id = ?
       LIMIT 1
       FOR UPDATE`,
      [sessionId, roundId],
    );

    if (existingRound) {
      const wallet = await getWalletBalance(userId, connection);
      await connection.commit();
      return res.json({
        success: true,
        duplicate: true,
        message: 'Round already processed',
        roundId,
        betAmount: Number(existingRound.bet_amount),
        winAmount: Number(existingRound.win_amount),
        netAmount: Number(existingRound.net_amount),
        balance: wallet.balance,
      });
    }

    const [[session]] = await connection.query(
      `SELECT gs.id, gs.user_id, gs.game_id, gs.provider_id, gs.status,
              g.name AS game_name, g.min_bet,
              p.code AS provider_code, p.adapter_key
       FROM game_sessions gs
       INNER JOIN games g ON g.id = gs.game_id
       INNER JOIN providers p ON p.id = gs.provider_id
       WHERE gs.id = ? AND gs.user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [sessionId, userId],
    );

    if (!session) {
      await connection.rollback();
      return res.status(404).json({ error: 'Game session not found' });
    }

    if (session.status !== 'active') {
      await connection.rollback();
      return res.status(400).json({ error: 'Game session is not active' });
    }

    const wallet = await getWalletBalance(userId, connection);
    const settlement = await settleGameRound({
      provider: {
        code: session.provider_code,
        adapter_key: session.adapter_key,
      },
      payload: {
        betAmount,
        balance: wallet.balance,
        roundId,
        providerPayload: {
          ...providerPayload,
          winAmount: requestedWinAmount,
        },
      },
    });

    const winAmount = Number(settlement.winAmount);
    const netAmount = Number(settlement.netAmount);
    const finalBet = Number(settlement.betAmount);

    if (finalBet > wallet.balance) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await applyBalanceDelta(connection, userId, netAmount);

    const [roundResult] = await connection.query(
      `INSERT INTO game_rounds
       (session_id, user_id, game_id, provider_id, round_id, bet_amount, win_amount, net_amount, status, provider_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'settled', ?)`,
      [
        sessionId,
        userId,
        session.game_id,
        session.provider_id,
        roundId,
        finalBet,
        winAmount,
        netAmount,
        JSON.stringify(settlement),
      ],
    );

    const [betTx] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'bet', ?, 'approved', ?, NOW())`,
      [userId, finalBet, `game:${session.game_id}`],
    );

    if (winAmount > 0) {
      await connection.query(
        `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
         VALUES (?, 'win', ?, 'approved', ?, NOW())`,
        [userId, winAmount, `game:${session.game_id}`],
      );
    }

    await connection.query(
      `INSERT INTO bet_records (user_id, game_name, bet_amount, win_amount, profit_loss, status)
       VALUES (?, ?, ?, ?, ?, 'settled')`,
      [userId, session.game_name, finalBet, winAmount, netAmount],
    );

    await connection.query(
      `UPDATE user_wallets
       SET completed_turnover = completed_turnover + ?
       WHERE user_id = ?`,
      [finalBet, userId],
    );

    await applyBonusClaimTurnover(connection, userId, finalBet);
    await applyDepositBonusTurnover(connection, userId, finalBet);

    if (netAmount < 0) {
      await applySafeCashback(connection, userId, netAmount);
    }

    await processUserVipProgress(userId, connection, { betAmount: finalBet });

    await logApiEvent(connection, {
      userId,
      providerId: session.provider_id,
      endpoint: '/api/game/result',
      method: 'POST',
      requestPayload: req.body,
      responsePayload: {
        roundId,
        betAmount: finalBet,
        winAmount,
        netAmount,
      },
      statusCode: 200,
    });

    await connection.commit();

    applyReferralGameProfitLoss(userId, netAmount).catch((err) => {
      console.error('Affiliate balance update failed:', err.message);
    });

    const updatedWallet = await getWalletBalance(userId);

    return res.json({
      success: true,
      duplicate: false,
      sessionId,
      roundId,
      roundRecordId: roundResult.insertId,
      betTransactionId: betTx.insertId,
      betAmount: finalBet,
      winAmount,
      netAmount,
      balance: updatedWallet.balance,
      outcome: netAmount > 0 ? 'win' : netAmount < 0 ? 'loss' : 'draw',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit game result error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to process game result',
    });
  } finally {
    connection.release();
  }
}

export async function resolveGameByCode(req, res) {
  const pool = getPool();
  const gameCode = String(req.query.code || req.params.code || '').trim();
  const providerId = Number(req.query.providerId || 0);

  if (!gameCode) {
    return res.status(400).json({ error: 'Game code is required' });
  }

  try {
    const params = [gameCode];
    let providerClause = '';
    if (providerId) {
      providerClause = ' AND g.provider_id = ?';
      params.push(providerId);
    }

    const [[game]] = await pool.query(
      `SELECT g.id, g.code, g.name, g.category, g.image_url, g.custom_image_url, g.min_bet, g.provider_id,
              p.code AS provider_code, p.name AS provider_name
       FROM games g
       INNER JOIN providers p ON p.id = g.provider_id
       WHERE g.code = ?
         AND g.status = 'active'
         AND (g.is_active = 1 OR g.is_active IS NULL)
         AND p.status = 'active'
         AND (p.enabled = 1 OR p.enabled IS NULL)${providerClause}
       ORDER BY g.id ASC
       LIMIT 1`,
      params,
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    return res.json({
      id: game.id,
      code: game.code,
      name: game.name,
      category: game.category,
      image: resolveGameImage(game),
      minBet: Number(game.min_bet),
      providerId: game.provider_id,
      providerCode: game.provider_code,
      providerName: game.provider_name,
    });
  } catch (error) {
    console.error('Resolve game by code error:', error);
    return res.status(500).json({ error: 'Failed to resolve game' });
  }
}

export default {
  getUserBalance,
  startGame,
  submitGameResult,
  resolveGameByCode,
};
