import { getPool } from '../config/db.js';
import { validateWithdrawAmount } from '../services/generalSettingsService.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import {
  enforceBonusTurnoverForWithdraw,
  enforceTurnoverForWithdraw,
} from '../services/withdrawEligibilityService.js';
import {
  OTP_EXPIRY_MS,
  buildOtpIdentifier,
  createUserOtp,
  maskPhone,
  sendUserOtpSms,
  verifyUserOtp,
} from '../services/otpService.js';
import { getSmsSettingsInternal } from '../services/smsApiSettingsService.js';
import { assertPlayerCanWithdraw } from '../services/playerWithdrawGuardService.js';
import { assertWithdrawChannelForPayment } from '../services/withdrawChannelService.js';
import { forwardWithdrawToPaymentGateway } from '../services/paymentWithdrawGatewayService.js';

function getUserId(req) {
  return Number(req.user?.sub);
}

async function ensureActivePlayerAccount(userId, res) {
  const pool = getPool();
  const [[user]] = await pool.query(`SELECT status FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!user || user.status === 'deleted') {
    res.status(403).json({ error: 'Account is not available' });
    return false;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended' });
    return false;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return false;
  }
  return true;
}

function isDemoResponse(settings, smsResult) {
  return settings.apiMode === 'demo' || Boolean(smsResult?.demo);
}

export async function requestUserWithdrawOtp(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;
  if (!(await assertPlayerCanWithdraw(userId, res))) return;

  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  try {
    await validateWithdrawAmount(amount);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  try {
    await assertWithdrawChannelForPayment(pool, userId);
  } catch (error) {
    return res.status(error.statusCode || 403).json({ error: error.message });
  }

  try {
    const [[user]] = await pool.query(
      `SELECT id, name, phone, balance, status FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    if (!user?.phone) {
      return res.status(400).json({ error: 'Phone number is required for withdraw OTP' });
    }

    if (Number(user.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await ensureUserWallet(userId);

    const [[wallet]] = await pool.query(
      `SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id = ? LIMIT 1`,
      [userId],
    );

    try {
      await enforceTurnoverForWithdraw(wallet);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    const connection = await pool.getConnection();
    try {
      const identifier = buildOtpIdentifier(user);
      const { otp } = await createUserOtp(connection, {
        userId: user.id,
        identifier,
        purpose: 'withdraw',
        amount,
      });

      const settings = await getSmsSettingsInternal();
      const smsResult = await sendUserOtpSms({
        mobile: user.phone,
        otp,
        purpose: 'withdraw',
        amount,
      });

      return res.json({
        success: true,
        message: 'Withdraw OTP sent',
        expiresIn: OTP_EXPIRY_MS / 1000,
        maskedPhone: maskPhone(user.phone),
        ...(isDemoResponse(settings, smsResult) ? { demoOtp: otp } : {}),
      });
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Request user withdraw OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to send withdraw OTP' });
  }
}

export async function createWithdrawRequestWithOtp(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;
  if (!(await assertPlayerCanWithdraw(userId, res))) return;

  const amount = Number(req.body.amount);
  const method = String(req.body.method || 'bank').trim();
  const accountNumber = String(req.body.accountNumber || req.body.account_number || '').trim();
  const otp = String(req.body.otp || '').trim();

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number is required' });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP is required' });
  }

  try {
    await validateWithdrawAmount(amount);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureUserWallet(userId);
    await assertWithdrawChannelForPayment(connection, userId);

    const [[user]] = await connection.query(
      `SELECT id, name, phone, balance FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );

    const [[wallet]] = await connection.query(
      `SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [userId],
    );

    try {
      await enforceTurnoverForWithdraw(wallet);
      await enforceBonusTurnoverForWithdraw(userId, connection);
    } catch (error) {
      await connection.rollback();
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    if (Number(user.balance) < amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await verifyUserOtp(connection, {
      identifier: buildOtpIdentifier(user),
      purpose: 'withdraw',
      otp,
      amount,
    });

    const [txResult] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method)
       VALUES (?, 'withdraw', ?, 'pending', ?)`,
      [userId, amount, method],
    );

    await connection.query(
      `INSERT INTO withdraw_requests (user_id, amount, method, account_number, status, transaction_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [userId, amount, method, accountNumber, txResult.insertId],
    );

    await connection.commit();

    let gateway = null;
    try {
      gateway = await forwardWithdrawToPaymentGateway({
        userId,
        transactionId: txResult.insertId,
        amount,
        method,
        accountNumber,
      });
    } catch (gatewayError) {
      console.error('Withdraw gateway error:', gatewayError);
      return res.status(gatewayError.statusCode || 502).json({
        success: false,
        error: gatewayError.message || 'Withdrawal gateway request failed',
        transactionId: txResult.insertId,
      });
    }

    return res.status(201).json({
      success: true,
      message: gateway?.message || 'Withdraw request submitted',
      gateway,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Withdraw request with OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to submit withdraw request' });
  } finally {
    connection.release();
  }
}

export default {
  requestUserWithdrawOtp,
  createWithdrawRequestWithOtp,
};
