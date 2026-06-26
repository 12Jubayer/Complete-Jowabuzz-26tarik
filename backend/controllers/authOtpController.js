import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { signUserToken, signUserRefreshToken } from '../utils/jwt.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import {
  OTP_EXPIRY_MS,
  buildOtpIdentifier,
  createUserOtp,
  maskPhone,
  normalizeIdentifier,
  normalizePhoneDigits,
  sendUserOtpSms,
  verifyUserOtp,
} from '../services/otpService.js';
import { getSmsSettingsInternal } from '../services/smsApiSettingsService.js';

async function findUserByIdentifier(pool, identifier) {
  const term = normalizeIdentifier(identifier);
  const phoneDigits = normalizePhoneDigits(term);

  const [rows] = await pool.query(
    `SELECT id, name, phone, email, password_hash, balance, status, role
     FROM users
     WHERE role = 'user'
       AND (name = ? OR phone = ? OR phone = ?)
     LIMIT 1`,
    [term, term, phoneDigits],
  );

  return rows[0] || null;
}

function isDemoResponse(settings, smsResult) {
  return settings.apiMode === 'demo' || Boolean(smsResult?.demo);
}

export async function requestLoginOtp(req, res) {
  const pool = getPool();
  const identifier = normalizeIdentifier(req.body.identifier || req.body.username || req.body.phone);

  if (!identifier) {
    return res.status(400).json({ error: 'Username or phone is required' });
  }

  try {
    const user = await findUserByIdentifier(pool, identifier);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number linked to this account' });
    }

    const connection = await pool.getConnection();
    try {
      const otpIdentifier = buildOtpIdentifier(user);
      const { otp } = await createUserOtp(connection, {
        userId: user.id,
        identifier: otpIdentifier,
        purpose: 'login',
      });

      const settings = await getSmsSettingsInternal();
      const smsResult = await sendUserOtpSms({
        mobile: user.phone,
        otp,
        purpose: 'login',
      });

      return res.json({
        success: true,
        message: 'Login OTP sent',
        maskedPhone: maskPhone(user.phone),
        expiresIn: OTP_EXPIRY_MS / 1000,
        ...(isDemoResponse(settings, smsResult) ? { demoOtp: otp } : {}),
      });
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Request login OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to send login OTP' });
  }
}

export async function verifyLoginOtp(req, res) {
  const pool = getPool();
  const identifier = normalizeIdentifier(req.body.identifier || req.body.username || req.body.phone);
  const otp = String(req.body.otp || '').trim();

  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Identifier and OTP are required' });
  }

  try {
    const user = await findUserByIdentifier(pool, identifier);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await verifyUserOtp(connection, {
        identifier: buildOtpIdentifier(user),
        purpose: 'login',
        otp,
      });

      const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
      await connection.query(
        `UPDATE users SET last_login = NOW(), last_login_ip = ? WHERE id = ?`,
        [clientIp, user.id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await ensureUserWallet(user.id);

    const token = signUserToken(user);
    const refreshToken = signUserRefreshToken(user);

    const [[affiliate]] = await pool.query(
      `SELECT referral_code FROM affiliate_profiles WHERE user_id = ? LIMIT 1`,
      [user.id],
    );

    return res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.name,
        phone: user.phone,
        email: user.email,
        balance: Number(user.balance),
        referralCode: affiliate?.referral_code || null,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Login OTP verification failed' });
  }
}

export async function requestForgotPasswordOtp(req, res) {
  const pool = getPool();
  const identifier = normalizeIdentifier(req.body.identifier || req.body.username || req.body.phone);

  if (!identifier) {
    return res.status(400).json({ error: 'Username or phone is required' });
  }

  try {
    const user = await findUserByIdentifier(pool, identifier);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number linked to this account' });
    }

    const connection = await pool.getConnection();
    try {
      const otpIdentifier = buildOtpIdentifier(user);
      const { otp } = await createUserOtp(connection, {
        userId: user.id,
        identifier: otpIdentifier,
        purpose: 'forgot_password',
      });

      const settings = await getSmsSettingsInternal();
      const smsResult = await sendUserOtpSms({
        mobile: user.phone,
        otp,
        purpose: 'forgot_password',
      });

      return res.json({
        success: true,
        message: 'OTP sent successfully',
        maskedPhone: maskPhone(user.phone),
        expiresIn: OTP_EXPIRY_MS / 1000,
        ...(isDemoResponse(settings, smsResult) ? { demoOtp: otp } : {}),
      });
    } catch (error) {
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Request forgot password OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to send OTP' });
  }
}

export async function verifyForgotPasswordOtp(req, res) {
  const pool = getPool();
  const identifier = normalizeIdentifier(req.body.identifier || req.body.username || req.body.phone);
  const otp = String(req.body.otp || '').trim();

  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Identifier and OTP are required' });
  }

  try {
    const user = await findUserByIdentifier(pool, identifier);
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await verifyUserOtp(connection, {
        identifier: buildOtpIdentifier(user),
        purpose: 'forgot_password',
        otp,
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify forgot password OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'OTP verification failed' });
  }
}

export async function resetPasswordWithOtp(req, res) {
  const pool = getPool();
  const identifier = normalizeIdentifier(req.body.identifier || req.body.username || req.body.phone);
  const otp = String(req.body.otp || '').trim();
  const newPassword = String(req.body.newPassword || req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || newPassword);

  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const user = await findUserByIdentifier(pool, identifier);
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await verifyUserOtp(connection, {
        identifier: buildOtpIdentifier(user),
        purpose: 'forgot_password',
        otp,
      });

      const passwordHash = await hashPassword(newPassword);
      await connection.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, user.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password with OTP error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to reset password' });
  }
}

export default {
  requestLoginOtp,
  verifyLoginOtp,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
};
