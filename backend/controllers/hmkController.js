import {
  checkHmkApiHealth,
  getHmkPublicStatus,
  launchHmkGameSession,
  processHmkCallback,
  verifyHmkCallbackSignature,
} from '../services/hmkApiService.js';
import { getPool } from '../config/db.js';
import { syncAllWalletBalances, getAuthoritativeWalletBalance, normalizeLaunchBalance } from '../services/gameWalletService.js';
import crypto from 'crypto';

export async function handleHmkCallback(req, res) {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    if (!verifyHmkCallbackSignature(req, rawBody)) {
      return res.status(401).json({ error: 'Invalid callback signature' });
    }
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await processHmkCallback(payload);
    return res.json({
      credit_amount: result.credit_amount,
      balance: result.balance,
      money: result.money,
      user_balance: result.user_balance ?? result.balance,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('[HMK Callback] error', { message: error.message, statusCode: error.statusCode });
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Callback processing failed',
    });
  }
}

export async function launchHmkGame(req, res) {
  try {
    const userId = Number(req.user?.sub);
    const gameUid = req.body?.game_uid || req.body?.gameId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const pool = getPool();
    const [[user]] = await pool.query(`SELECT id, balance, status FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User account is not active' });
    }

    const [[game]] = await pool.query(
      `SELECT g.id, g.code, g.name, g.provider_id, p.code AS provider_code, p.adapter_key
       FROM games g INNER JOIN providers p ON p.id = g.provider_id
       WHERE g.code = ? LIMIT 1`,
      [String(gameUid).trim()],
    );

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    await syncAllWalletBalances(userId);
    const launchBalance = await getAuthoritativeWalletBalance(userId);
    const sessionToken = crypto.randomBytes(24).toString('hex');

    const result = await launchHmkGameSession({ user, game, sessionToken, launchBalance });
    return res.json({ success: true, url: result.launchUrl });
  } catch (error) {
    console.error('[HMK Launch] error', { message: error.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to launch game. Please try again.',
    });
  }
}

export async function getHmkAdminStatus(req, res) {
  const status = getHmkPublicStatus();
  const health = await checkHmkApiHealth();
  return res.json({ ...status, health });
}

export default { handleHmkCallback, launchHmkGame, getHmkAdminStatus };
