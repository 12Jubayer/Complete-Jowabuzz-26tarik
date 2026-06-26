import {
  getSoftApiPublicStatus,
  launchSoftApiGameForUser,
  processSoftApiCallback,
} from '../services/softapiService.js';

export async function handleSoftApiCallback(req, res) {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const result = await processSoftApiCallback(payload);
    return res.json({
      credit_amount: result.credit_amount,
      balance: result.balance,
      money: result.money,
      user_balance: result.user_balance ?? result.balance,
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error('[SoftAPI Callback] error', {
      message: error.message,
      statusCode: error.statusCode,
    });
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Callback processing failed',
    });
  }
}

export async function launchSoftApiGame(req, res) {
  try {
    const userId = Number(req.user?.sub);
    const gameUid = req.body?.game_uid;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const result = await launchSoftApiGameForUser(userId, gameUid);
    return res.json({
      success: true,
      url: result.url,
    });
  } catch (error) {
    console.error('[SoftAPI Launch] error', { message: error.message });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to launch game. Please try again.',
    });
  }
}

export async function getSoftApiAdminStatus(req, res) {
  return res.json(getSoftApiPublicStatus());
}

export default {
  handleSoftApiCallback,
  launchSoftApiGame,
  getSoftApiAdminStatus,
};
