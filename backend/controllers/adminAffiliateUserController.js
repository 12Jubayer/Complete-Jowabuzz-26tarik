import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  createAffiliateProfile,
} from '../services/affiliateService.js';
import { logAdminAudit } from '../services/adminPlayerService.js';
import {
  buildReferralLink,
  formatAffiliateIdentifier,
  mapAffiliateStatusForDb,
  mapAffiliateStatusForUi,
} from '../services/adminAffiliateUserService.js';
import { notifyAffiliateApproved } from '../services/affiliateNotificationService.js';
import { creditAffiliateUserBalance, ensureAffiliateZeroTurnover } from '../services/affiliateUserBalanceService.js';
import { applyAdminAffiliateBalanceAdjustment } from '../services/affiliateBalanceAdjustmentService.js';
import { ensureUserWallet } from '../services/userWalletService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildAffiliateFilters(query) {
  const filters = [];
  const params = [];

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    const dbStatus = mapAffiliateStatusForDb(status);
    filters.push('ap.status = ?');
    params.push(dbStatus);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(u.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR ap.referral_code LIKE ? OR CAST(ap.id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR ap.id = ? OR ap.user_id = ?' : ''
      })`,
    );
    params.push(like, like, like, like, like, like);
    if (numericId > 0) {
      params.push(numericId, numericId);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params };
}

function getAdminMeta(req) {
  return {
    adminId: Number(req.admin?.sub) || null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  };
}

async function fetchAffiliateOrThrow(db, affiliateId) {
  const [[row]] = await db.query(
    `SELECT
       ap.id,
       ap.user_id,
       ap.referral_code,
       ap.commission_percent,
       ap.status,
       ap.total_referrals,
       ap.total_link_clicks,
       ap.total_signups,
       ap.total_deposit,
       ap.total_withdraw,
       ap.total_turnover,
       ap.total_profit_loss,
       ap.pending_commission,
       ap.settled_commission,
       ap.created_at,
       u.name,
       u.username,
       u.phone,
       u.email,
       u.last_login
     FROM affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     WHERE ap.id = ?
     LIMIT 1`,
    [affiliateId],
  );

  if (!row) {
    const error = new Error('Affiliate not found');
    error.statusCode = 404;
    throw error;
  }

  return row;
}

function formatAffiliateRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    affiliateId: row.id,
    referralCode: row.referral_code,
    name: row.name,
    username: row.username,
    phone: row.phone,
    email: row.email,
    identifier: formatAffiliateIdentifier(row),
    role: 'affiliate',
    balance: Number(row.settled_commission),
    settledCommission: Number(row.settled_commission),
    pendingCommission: Number(row.pending_commission),
    status: mapAffiliateStatusForUi(row.status),
    rawStatus: row.status,
    createdAt: row.created_at,
  };
}

export async function listAdminAffiliates(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildAffiliateFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT
         ap.id,
         ap.user_id,
         ap.referral_code,
         ap.status,
         ap.settled_commission,
         ap.pending_commission,
         ap.created_at,
         u.name,
         u.username,
         u.phone,
         u.email
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       ${whereClause}
       ORDER BY ap.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map(formatAffiliateRow),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin affiliates error:', error);
    return res.status(500).json({ error: 'Failed to fetch affiliates' });
  }
}

export async function getAdminAffiliateInfo(req, res) {
  const pool = getPool();
  const affiliateId = Number(req.params.id);

  if (!affiliateId) {
    return res.status(400).json({ error: 'Invalid affiliate id' });
  }

  try {
    const affiliate = await fetchAffiliateOrThrow(pool, affiliateId);

    const [[signupStats]] = await pool.query(
      `SELECT COUNT(*) AS totalSignups
       FROM affiliate_profiles child
       WHERE child.referred_by = ?`,
      [affiliateId],
    );

    const [transactions] = await pool.query(
      `SELECT id, type, amount, reason, status, created_at AS createdAt
       FROM affiliate_transactions
       WHERE affiliate_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [affiliateId],
    );

    return res.json({
      affiliateId: affiliate.id,
      linkedUserId: affiliate.user_id,
      referralCode: affiliate.referral_code,
      referralLink: buildReferralLink(affiliate.referral_code),
      name: affiliate.name,
      username: affiliate.username,
      phone: affiliate.phone,
      email: affiliate.email,
      role: 'affiliate',
      status: mapAffiliateStatusForUi(affiliate.status),
      rawStatus: affiliate.status,
      balance: Number(affiliate.settled_commission),
      pendingCommission: Number(affiliate.pending_commission),
      settledCommission: Number(affiliate.settled_commission),
      commissionPercent: Number(affiliate.commission_percent),
      totalReferrals: Number(affiliate.total_referrals),
      totalLinkClicks: Number(affiliate.total_link_clicks || 0),
      totalSignups: Number(signupStats.totalSignups || affiliate.total_signups || 0),
      totalDeposit: Number(affiliate.total_deposit),
      totalTurnover: Number(affiliate.total_turnover),
      totalProfitLoss: Number(affiliate.total_profit_loss),
      joinedDate: affiliate.created_at,
      lastLogin: affiliate.last_login,
      latestTransactions: transactions.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get admin affiliate info error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load affiliate info',
    });
  }
}

export async function createAdminAffiliateUser(req, res) {
  const pool = getPool();
  const name = String(req.body.name || '').trim();
  const username = String(req.body.username || '').trim();
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const email = String(req.body.email || '').trim().toLowerCase() || null;
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || '');
  const initialBalance = Number(req.body.initialBalance || req.body.initial_balance || 0);
  const statusInput = String(req.body.status || 'pending').trim().toLowerCase();
  const { adminId, ipAddress } = getAdminMeta(req);

  const allowedStatus = ['pending', 'approved'];
  const dbStatus = allowedStatus.includes(statusInput) ? statusInput : 'pending';

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!phone && !email) {
    return res.status(400).json({ error: 'Phone or email is required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (initialBalance < 0) {
    return res.status(400).json({ error: 'Initial balance cannot be negative' });
  }

  const resolvedPhone = phone || `AFF${Date.now().toString().slice(-10)}`;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (phone) {
      const [[existingPhone]] = await connection.query(
        `SELECT id FROM users WHERE phone = ? LIMIT 1`,
        [phone],
      );
      if (existingPhone) {
        await connection.rollback();
        return res.status(409).json({ error: 'Phone number already registered' });
      }
    }

    if (email) {
      const [[existingEmail]] = await connection.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email],
      );
      if (existingEmail) {
        await connection.rollback();
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    if (username) {
      const [[existingUsername]] = await connection.query(
        `SELECT id FROM users WHERE username = ? LIMIT 1`,
        [username],
      );
      if (existingUsername) {
        await connection.rollback();
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const passwordHash = await hashPassword(password);

    const [userResult] = await connection.query(
      `INSERT INTO users (name, username, email, phone, password_hash, role, balance, status)
       VALUES (?, ?, ?, ?, ?, 'user', 0, 'active')`,
      [name, username || null, email, resolvedPhone, passwordHash],
    );

    const userId = userResult.insertId;
    await connection.commit();

    await ensureUserWallet(userId);
    await ensureAffiliateZeroTurnover(userId);
    const profile = await createAffiliateProfile(userId, null, null, {
      registeredAsAffiliate: true,
    });

    await pool.query(
      `UPDATE affiliate_profiles SET status = ?, settled_commission = ? WHERE id = ?`,
      [dbStatus, initialBalance, profile.id],
    );

    if (initialBalance > 0) {
      await creditAffiliateUserBalance(userId, initialBalance);
      await pool.query(
        `INSERT INTO affiliate_transactions (affiliate_id, type, amount, reason, status)
         VALUES (?, 'add', ?, 'Initial balance', 'completed')`,
        [profile.id, initialBalance],
      );
    }

    await logAdminAudit(getPool(), {
      adminId,
      userId,
      action: 'affiliate_create',
      details: {
        affiliateId: profile.id,
        referralCode: profile.referralCode,
        name,
        username,
        phone: resolvedPhone,
        email,
        status: dbStatus,
        initialBalance,
      },
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      affiliate: {
        id: profile.id,
        referralCode: profile.referralCode,
        referralLink: buildReferralLink(profile.referralCode),
        status: mapAffiliateStatusForUi(dbStatus),
        balance: initialBalance,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create admin affiliate error:', error);
    return res.status(500).json({ error: 'Failed to create affiliate' });
  } finally {
    connection.release();
  }
}

async function setAffiliateStatus(req, res, nextStatus, successMessage) {
  const pool = getPool();
  const affiliateId = Number(req.params.id);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!affiliateId) {
    return res.status(400).json({ error: 'Invalid affiliate id' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const affiliate = await fetchAffiliateOrThrow(connection, affiliateId);

    await connection.query(`UPDATE affiliate_profiles SET status = ? WHERE id = ?`, [
      nextStatus,
      affiliateId,
    ]);

    await logAdminAudit(connection, {
      adminId,
      userId: affiliate.user_id,
      action: 'affiliate_status_update',
      details: { affiliateId, from: affiliate.status, to: nextStatus },
      ipAddress,
    });

    await connection.commit();

    if (nextStatus === 'approved' && affiliate.status === 'pending' && affiliate.email) {
      notifyAffiliateApproved({
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referral_code,
      }).catch((error) => {
        console.error('Affiliate approval email error:', error.message);
      });
    }

    return res.json({
      success: true,
      message: successMessage,
      status: mapAffiliateStatusForUi(nextStatus),
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update affiliate status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update affiliate status',
    });
  } finally {
    connection.release();
  }
}

export async function approveAdminAffiliateUser(req, res) {
  return setAffiliateStatus(req, res, 'approved', 'Affiliate approved successfully');
}

export async function rejectAdminAffiliateUser(req, res) {
  return setAffiliateStatus(req, res, 'rejected', 'Affiliate rejected successfully');
}

export async function updateAdminAffiliateUserStatus(req, res) {
  const statusInput = String(req.body.status || '').trim().toLowerCase();

  if (statusInput === 'active') {
    return setAffiliateStatus(req, res, 'approved', 'Affiliate activated');
  }

  if (statusInput === 'suspended') {
    return setAffiliateStatus(req, res, 'blocked', 'Affiliate suspended');
  }

  return res.status(400).json({ error: 'Invalid status. Use active or suspended' });
}

export async function adjustAdminAffiliateBalance(req, res) {
  const affiliateId = Number(req.params.id);
  const type = String(req.body.type || '').trim().toLowerCase();
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || '').trim();
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!affiliateId || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ error: 'Invalid affiliate id or adjustment type' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  try {
    const result = await applyAdminAffiliateBalanceAdjustment({
      affiliateId,
      type,
      amount,
      reason,
      adminId,
      ipAddress,
    });

    return res.json({
      success: true,
      message: 'Balance updated successfully',
      balance: result.settledCommission,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error('Adjust affiliate balance error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to adjust affiliate balance',
    });
  }
}

export async function changeAdminAffiliatePassword(req, res) {
  const pool = getPool();
  const affiliateId = Number(req.params.id);
  const password = String(req.body.password || req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!affiliateId) {
    return res.status(400).json({ error: 'Invalid affiliate id' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const affiliate = await fetchAffiliateOrThrow(pool, affiliateId);
    const passwordHash = await hashPassword(password);

    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      passwordHash,
      affiliate.user_id,
    ]);

    await logAdminAudit(pool, {
      adminId,
      userId: affiliate.user_id,
      action: 'affiliate_password_change',
      details: { affiliateId },
      ipAddress,
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change affiliate password error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to change password',
    });
  }
}

export default listAdminAffiliates;
