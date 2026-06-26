import { getPool } from '../config/db.js';

import { hashPassword, comparePassword } from '../utils/password.js';
import { signUserToken, signUserRefreshToken, verifyToken, jwt } from '../utils/jwt.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import { ensureProviderUsername } from '../services/providerUsernameService.js';
import {
  findActivePlayerUsernameConflict,
  purgeDeletedPlayerRegistrationConflicts,
} from '../services/adminPlayerService.js';

import {

  createAffiliateProfile,

  findAffiliateByReferralCode,

} from '../services/affiliateService.js';



function normalizePhone(phone = '') {

  return String(phone).replace(/\D/g, '');

}



export async function registerUser(req, res) {

  const pool = getPool();

  const name = String(req.body.name || req.body.username || '').trim();

  const phone = normalizePhone(req.body.phone);

  const password = String(req.body.password || '');

  const refCode = String(req.body.ref || req.body.referralCode || req.body.referCode || '')

    .trim()

    .toUpperCase();



  if (!name) {

    return res.status(400).json({ error: 'Name is required' });

  }



  if (!phone) {

    return res.status(400).json({ error: 'Phone number is required' });

  }



  if (!password) {

    return res.status(400).json({ error: 'Password is required' });

  }



  const connection = await pool.getConnection();



  try {

    await connection.beginTransaction();

    await purgeDeletedPlayerRegistrationConflicts(connection, { phone, name });

    const [existingByPhone] = await connection.query(
      `SELECT id FROM users WHERE phone = ? AND status <> 'deleted' LIMIT 1`,
      [phone],
    );

    if (existingByPhone.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const existingByName = await findActivePlayerUsernameConflict(connection, name);
    if (existingByName) {
      await connection.rollback();
      return res.status(409).json({ error: 'Username already exists' });
    }



    let referredByAffiliateId = null;



    if (refCode) {

      const referrer = await findAffiliateByReferralCode(refCode);



      if (referrer?.status === 'approved') {

        referredByAffiliateId = referrer.id;

      }

    }



    const passwordHash = await hashPassword(password);



    const [result] = await connection.query(

      `INSERT INTO users (name, username, email, phone, password_hash, role, balance, status)

       VALUES (?, ?, NULL, ?, ?, 'user', 0, 'active')`,

      [name, name, phone, passwordHash],

    );



    const affiliateProfile = await createAffiliateProfile(
      result.insertId,
      referredByAffiliateId,
      connection,
    );



    await connection.commit();

    const userId = result.insertId;
    await ensureUserWallet(userId);

    const providerUsername =
      (await ensureProviderUsername(userId)) || null;

    const [[createdUser]] = await pool.query(
      `SELECT id, name, phone, email, balance, status, role, provider_username
       FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    const token = signUserToken(createdUser);
    const refreshToken = signUserRefreshToken(createdUser);

    return res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: userId,
        name,
        username: name,
        phone,
        balance: 0,
        providerUsername,
        referralCode: affiliateProfile.referralCode,
        role: 'user',
        status: 'active',
      },
      affiliate: {
        referralCode: affiliateProfile.referralCode,
        status: 'pending',
        referredBy: referredByAffiliateId,
      },
    });

  } catch (error) {

    await connection.rollback();

    console.error('Register user error:', error);

    return res.status(500).json({ error: 'Failed to register user' });

  } finally {

    connection.release();

  }

}



export async function loginUser(req, res) {
  const pool = getPool();
  const identifier = String(req.body.identifier || req.body.username || req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/phone and password are required' });
  }

  const phoneDigits = identifier.replace(/\D/g, '');

  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, email, password_hash, balance, status, role, provider_username
       FROM users
       WHERE role = 'user'
         AND (name = ? OR phone = ? OR phone = ?)
       LIMIT 1`,
      [identifier, identifier, phoneDigits],
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.status === 'deleted') {
      return res.status(403).json({ error: 'Account has been deleted' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;

    await pool.query(
      `UPDATE users SET last_login = NOW(), last_login_ip = ? WHERE id = ?`,
      [clientIp, user.id],
    );

    await ensureUserWallet(user.id);

    const providerUsernameForAuth =
      (await ensureProviderUsername(user.id)) || String(user.provider_username || '').trim();

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
        providerUsername: providerUsernameForAuth || null,
        referralCode: affiliate?.referral_code || null,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login user error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}



export async function refreshUserToken(req, res) {
  const refreshToken = String(req.body.refreshToken || '').trim();

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const decoded = verifyToken(refreshToken);

    if (decoded.role !== 'user' || decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    }

    const pool = getPool();
    const [[user]] = await pool.query(
      `SELECT id, name, phone, email, balance, status, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.sub],
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    }

    const token = signUserToken(user);
    const nextRefreshToken = signUserRefreshToken(user);

    return res.json({
      success: true,
      token,
      refreshToken: nextRefreshToken,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Session expired, please login again',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
  }
}



export default registerUser;

