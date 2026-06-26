import { getPool } from '../config/db.js';
import {
  createAffiliateProfile,
  findAffiliateByReferralCode,
} from '../services/affiliateService.js';
import {
  SETTLEMENT_USER_INVALID_MSG,
  setAffiliateSettlementUserId,
  validateActivePlayerUserId,
} from '../services/affiliateSettlementUserService.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import { ensureAffiliateZeroTurnover } from '../services/affiliateUserBalanceService.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAffiliateToken } from '../utils/jwt.js';

const STATUS_MESSAGES = {
  pending: 'Your affiliate account is pending approval',
  rejected: 'Your affiliate account was rejected',
  blocked: 'Your affiliate account is blocked',
};

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '');
}

function buildAffiliateAuthResponse(affiliate) {
  const token = signAffiliateToken({
    id: affiliate.id,
    user_id: affiliate.user_id,
    name: affiliate.name,
    referral_code: affiliate.referral_code,
  });

  return {
    success: true,
    token,
    affiliate: {
      id: affiliate.id,
      userId: affiliate.user_id,
      name: affiliate.name,
      phone: affiliate.phone,
      email: affiliate.email,
      referralCode: affiliate.referral_code,
      status: affiliate.status,
    },
  };
}

export async function loginAffiliate(req, res) {
  const pool = getPool();
  const identifier = String(req.body.identifier || req.body.username || req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/phone and password are required' });
  }

  const phoneDigits = normalizePhone(identifier);

  try {
    const [rows] = await pool.query(
      `SELECT
         ap.id,
         ap.user_id,
         ap.referral_code,
         ap.status,
         ap.commission_percent,
         u.name,
         u.phone,
         u.email,
         u.password_hash
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE ap.registered_as_affiliate = 1
         AND (u.name = ? OR u.username = ? OR u.phone = ? OR u.phone = ? OR u.email = ?)
       LIMIT 1`,
      [identifier, identifier, identifier, phoneDigits, identifier.toLowerCase()],
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const affiliate = rows[0];
    const validPassword = await comparePassword(password, affiliate.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (affiliate.status !== 'approved') {
      return res.status(403).json({
        error: STATUS_MESSAGES[affiliate.status] || 'Affiliate account is not active',
        status: affiliate.status,
      });
    }

    return res.json(buildAffiliateAuthResponse(affiliate));
  } catch (error) {
    console.error('Affiliate login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}

export async function registerAffiliate(req, res) {
  const pool = getPool();
  const name = String(req.body.name || req.body.username || '').trim();
  const phone = normalizePhone(req.body.phone);
  const email = String(req.body.email || '').trim().toLowerCase() || null;
  const password = String(req.body.password || '');
  const refCode = String(req.body.ref || req.body.referralCode || '').trim().toUpperCase();
  const settlementUserId = req.body.settlementUserId ?? req.body.settlement_user_id;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required for affiliate signup' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (settlementUserId === undefined || settlementUserId === null || settlementUserId === '') {
    return res.status(400).json({ error: SETTLEMENT_USER_INVALID_MSG });
  }

  const settlementValidation = await validateActivePlayerUserId(settlementUserId);
  if (!settlementValidation.valid) {
    return res.status(400).json({ error: settlementValidation.error });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingByPhone] = await connection.query(
      `SELECT id, email, name FROM users WHERE phone = ? AND status <> 'deleted' LIMIT 1`,
      [phone],
    );

    let referredByAffiliateId = null;

    if (refCode) {
      const referrer = await findAffiliateByReferralCode(refCode);
      if (referrer?.status === 'approved') {
        referredByAffiliateId = referrer.id;
      }
    }

    const passwordHash = await hashPassword(password);

    let userId;
    let profile;

    if (existingByPhone.length) {
      const existingUser = existingByPhone[0];
      userId = existingUser.id;

      const [existingAffiliate] = await connection.query(
        `SELECT id, referral_code, registered_as_affiliate
         FROM affiliate_profiles
         WHERE user_id = ?
         LIMIT 1`,
        [userId],
      );

      if (existingAffiliate.length && Number(existingAffiliate[0].registered_as_affiliate) === 1) {
        await connection.rollback();
        return res.status(409).json({ error: 'Affiliate account already exists. Please login instead.' });
      }

      if (email) {
        const [existingByEmail] = await connection.query(
          `SELECT id FROM users WHERE email = ? AND id <> ? AND status <> 'deleted' LIMIT 1`,
          [email, userId],
        );

        if (existingByEmail.length) {
          await connection.rollback();
          return res.status(409).json({ error: 'Email already registered' });
        }
      }

      await connection.query(
        `UPDATE users
         SET password_hash = ?,
             email = CASE WHEN ? IS NOT NULL AND (email IS NULL OR TRIM(email) = '') THEN ? ELSE email END
         WHERE id = ?`,
        [passwordHash, email, email, userId],
      );

      if (existingAffiliate.length) {
        await connection.query(
          `UPDATE affiliate_profiles
           SET registered_as_affiliate = 1,
               status = 'pending',
               registration_source = 'affiliate'
           WHERE user_id = ?`,
          [userId],
        );
        profile = {
          id: existingAffiliate[0].id,
          referralCode: existingAffiliate[0].referral_code,
        };
      } else {
        profile = await createAffiliateProfile(userId, referredByAffiliateId, connection, {
          registeredAsAffiliate: true,
        });
      }
    } else {
      const [existingByName] = await connection.query(
        `SELECT id FROM users WHERE name = ? AND status <> 'deleted' LIMIT 1`,
        [name],
      );

      if (existingByName.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'Username already exists' });
      }

      const [existingByEmail] = await connection.query(
        `SELECT id FROM users WHERE email = ? AND status <> 'deleted' LIMIT 1`,
        [email],
      );

      if (existingByEmail.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'Email already registered' });
      }

      const [userResult] = await connection.query(
        `INSERT INTO users (name, email, phone, password_hash, role, balance, status)
         VALUES (?, ?, ?, ?, 'user', 0, 'active')`,
        [name, email, phone, passwordHash],
      );

      userId = userResult.insertId;
      profile = await createAffiliateProfile(userId, referredByAffiliateId, connection, {
        registeredAsAffiliate: true,
      });
    }

    await setAffiliateSettlementUserId({
      affiliateId: profile.id,
      settlementUserId: settlementValidation.providerUsername,
      excludeUserId: userId,
      connection,
    });

    await connection.commit();
    await ensureUserWallet(userId);
    await ensureAffiliateZeroTurnover(userId);

    return res.status(201).json({
      success: true,
      message: 'Affiliate signup submitted successfully. Please wait for admin approval.',
      affiliate: {
        id: profile.id,
        name,
        email,
        phone,
        referralCode: profile.referralCode,
        status: 'pending',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Affiliate register error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to register affiliate account',
    });
  } finally {
    connection.release();
  }
}

export default loginAffiliate;
