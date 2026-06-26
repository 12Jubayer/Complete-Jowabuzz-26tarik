import {
  getGamingApiSettingsInternal,
  verifyGamingWebhookSecret,
} from '../services/gamingApiSettingsService.js';
import { applyBalanceDelta, getWalletBalance } from '../services/gameWalletService.js';
import { getPool } from '../config/db.js';

function extractWebhookSecret(req) {
  return (
    req.headers['x-webhook-secret'] ||
    req.headers['x-gaming-webhook-secret'] ||
    req.body?.webhookSecret ||
    req.body?.secret ||
    ''
  );
}

export async function handleGamingWebhook(req, res) {
  const pool = getPool();

  try {
    const settings = await getGamingApiSettingsInternal();

    if (!settings.isActive) {
      return res.status(503).json({ success: false, error: 'Gaming gateway is disabled' });
    }

    const providedSecret = extractWebhookSecret(req);
    if (!verifyGamingWebhookSecret(providedSecret, settings)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
    }

    const userId = Number(req.body.userId ?? req.body.user_id);
    const delta = Number(req.body.delta ?? req.body.amount ?? 0);
    const reference = String(req.body.reference || req.body.transactionId || req.body.transaction_id || '').trim();

    if (!userId || !Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ success: false, error: 'userId and non-zero delta are required' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await applyBalanceDelta(connection, userId, delta);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const wallet = await getWalletBalance(userId);

    return res.json({
      success: true,
      message: 'Balance updated',
      userId,
      delta,
      reference,
      balance: wallet.balance,
      currency: settings.currency,
    });
  } catch (error) {
    console.error('Gaming webhook error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to process gaming webhook',
    });
  }
}

export default { handleGamingWebhook };
