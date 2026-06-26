import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import { ensureAffiliateZeroTurnover } from '../services/affiliateUserBalanceService.js';
import {
  completePeriodSettlement,
  listAdminPeriodSettlements,
  rejectPeriodSettlement,
  runSettlementForActivePeriod,
} from '../services/affiliateSettlementPeriodService.js';
import { AFFILIATE_PENDING_THRESHOLD } from '../services/affiliateBalanceService.js';
import {
  completeSettlement,
  createAffiliateProfile,
  getAffiliateSettings,
  getWeekRange,
  refreshAffiliateStats,
  runAffiliateSettlement,
} from '../services/affiliateService.js';
import { notifyAffiliateApproved } from '../services/affiliateNotificationService.js';
import { getAdminReferralStatistics } from '../services/affiliateReferralStatsService.js';

export async function getAdminAffiliateUsers(req, res) {
  const pool = getPool();

  try {
    const [rows] = await pool.query(
      `SELECT
         ap.id,
         ap.user_id,
         u.name,
         u.phone,
         u.email,
         ap.referral_code,
         ap.commission_percent,
         ap.status,
         ap.total_referrals,
         ap.total_deposit,
         ap.total_withdraw,
         ap.pending_commission,
         ap.settled_commission,
         ap.created_at
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE ap.registered_as_affiliate = 1
       ORDER BY ap.created_at DESC`,
    );

    return res.json({
      affiliates: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        referralCode: row.referral_code,
        commissionPercent: Number(row.commission_percent),
        status: row.status,
        totalReferrals: Number(row.total_referrals),
        totalDeposit: Number(row.total_deposit),
        totalWithdraw: Number(row.total_withdraw),
        pendingCommission: Number(row.pending_commission),
        settledCommission: Number(row.settled_commission),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin affiliate users error:', error);
    return res.status(500).json({ error: 'Failed to load affiliate users' });
  }
}

export async function updateAffiliateStatus(req, res) {
  const pool = getPool();
  const affiliateId = Number(req.body.affiliateId);
  const status = String(req.body.status || '').trim();

  const allowed = ['pending', 'approved', 'rejected', 'blocked'];
  if (!affiliateId || !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid affiliate or status' });
  }

  try {
    const [[affiliate]] = await pool.query(
      `SELECT ap.id, ap.status, ap.referral_code, u.name, u.email
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE ap.id = ? AND ap.registered_as_affiliate = 1
       LIMIT 1`,
      [affiliateId],
    );

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const [result] = await pool.query(
      `UPDATE affiliate_profiles SET status = ? WHERE id = ? AND registered_as_affiliate = 1`,
      [status, affiliateId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (status === 'approved' && affiliate.status === 'pending' && affiliate.email) {
      notifyAffiliateApproved({
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referral_code,
      }).catch((error) => {
        console.error('Affiliate approval email error:', error.message);
      });
    }

    return res.json({ success: true, message: `Affiliate status updated to ${status}` });
  } catch (error) {
    console.error('Update affiliate status error:', error);
    return res.status(500).json({ error: 'Failed to update affiliate status' });
  }
}

export async function approveAffiliate(req, res) {
  req.body.status = 'approved';
  return updateAffiliateStatus(req, res);
}

export async function rejectAffiliate(req, res) {
  req.body.status = 'rejected';
  return updateAffiliateStatus(req, res);
}

export async function blockAffiliate(req, res) {
  req.body.status = 'blocked';
  return updateAffiliateStatus(req, res);
}

export async function updateAffiliateCommission(req, res) {
  const pool = getPool();
  const affiliateId = Number(req.body.affiliateId);
  const commissionPercent = Number(req.body.commissionPercent);

  const allowed = [5, 10, 15, 20, 25, 30];
  if (!affiliateId || !allowed.includes(commissionPercent)) {
    return res.status(400).json({ error: 'Invalid affiliate or commission percent' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE affiliate_profiles SET commission_percent = ? WHERE id = ? AND registered_as_affiliate = 1`,
      [commissionPercent, affiliateId],
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    return res.json({ success: true, message: 'Commission updated successfully' });
  } catch (error) {
    console.error('Update affiliate commission error:', error);
    return res.status(500).json({ error: 'Failed to update commission' });
  }
}

export async function updateGlobalCommission(req, res) {
  const pool = getPool();
  const commissionPercent = Number(req.body.commissionPercent);

  const allowed = [5, 10, 15, 20, 25, 30];
  if (!allowed.includes(commissionPercent)) {
    return res.status(400).json({ error: 'Invalid commission percent' });
  }

  try {
    await pool.query(
      `UPDATE affiliate_settings SET default_commission_percent = ? ORDER BY id ASC LIMIT 1`,
      [commissionPercent],
    );

    return res.json({ success: true, message: 'Default commission updated' });
  } catch (error) {
    console.error('Update global commission error:', error);
    return res.status(500).json({ error: 'Failed to update commission settings' });
  }
}

export async function getCommissionSettings(req, res) {
  try {
    const settings = await getAffiliateSettings();
    return res.json({
      defaultCommissionPercent: Number(settings.default_commission_percent),
      settlementType: settings.settlement_type || 'weekly',
      settlementDay: Number(settings.settlement_day),
      autoSettlement: Boolean(settings.auto_settlement),
      allowedPercents: [5, 10, 15, 20, 25, 30],
    });
  } catch (error) {
    console.error('Get commission settings error:', error);
    return res.status(500).json({ error: 'Failed to load commission settings' });
  }
}

export async function updateSettlementSettings(req, res) {
  const pool = getPool();
  const settlementType = String(req.body.settlementType || req.body.settlement_type || 'weekly').toLowerCase();
  const autoSettlement = req.body.autoSettlement ? 1 : 0;

  if (!['daily', 'weekly'].includes(settlementType)) {
    return res.status(400).json({ error: 'Invalid settlement type' });
  }

  let settlementDay = Number(req.body.settlementDay);
  if (settlementType === 'weekly') {
    if (!Number.isInteger(settlementDay) || settlementDay < 0 || settlementDay > 6) {
      return res.status(400).json({ error: 'Invalid settlement day' });
    }
  } else {
    const settings = await getAffiliateSettings();
    settlementDay = Number(settings.settlement_day ?? 0);
  }

  try {
    await pool.query(
      `UPDATE affiliate_settings
       SET settlement_type = ?, settlement_day = ?, auto_settlement = ?
       ORDER BY id ASC LIMIT 1`,
      [settlementType, settlementDay, autoSettlement],
    );

    return res.json({ success: true, message: 'Settlement settings updated' });
  } catch (error) {
    console.error('Update settlement settings error:', error);
    return res.status(500).json({ error: 'Failed to update settlement settings' });
  }
}

export async function getAdminSettlements(req, res) {
  const pool = getPool();

  try {
    const settings = await getAffiliateSettings();
    const currentType = String(settings.settlement_type || 'weekly').toLowerCase();
    const periodSettlements = await listAdminPeriodSettlements();

    const [legacyRows] = await pool.query(
      `SELECT
         sh.id,
         sh.affiliate_id,
         u.name AS affiliate_name,
         ap.referral_code,
         ap.user_id AS credit_user_id,
         cu.name AS credit_user_name,
         cu.balance AS credit_user_balance,
         sh.week_start,
         sh.week_end,
         sh.total_profit,
         sh.commission_percent,
         sh.amount,
         sh.status,
         sh.created_at
       FROM settlement_history sh
       INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
       INNER JOIN users u ON u.id = ap.user_id
       LEFT JOIN users cu ON cu.id = ap.user_id
       WHERE sh.status = 'pending'
         AND sh.amount >= ?
         AND NOT EXISTS (
           SELECT 1
           FROM affiliate_settlements s
           INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
           WHERE s.affiliate_id = sh.affiliate_id
             AND p.start_date = sh.week_start
             AND p.end_date = sh.week_end
         )
       ORDER BY sh.created_at DESC
       LIMIT 200`,
      [AFFILIATE_PENDING_THRESHOLD],
    );

    const legacySettlements = legacyRows
      .map((row) => {
        const start = String(row.week_start).slice(0, 10);
        const end = String(row.week_end).slice(0, 10);
        const isDaily = start === end;
        const settlementType = isDaily ? 'daily' : 'weekly';

        return {
          id: row.id,
          source: 'legacy',
          affiliateId: row.affiliate_id,
          affiliateName: row.affiliate_name,
          referralCode: row.referral_code,
          settlementType,
          settlementName: isDaily ? start : 'Legacy Weekly',
          weekRange: isDaily ? start : 'Legacy Weekly',
          dateRange: isDaily ? start : `${start} – ${end}`,
          startDate: row.week_start,
          endDate: row.week_end,
          weekStart: row.week_start,
          weekEnd: row.week_end,
          totalReferrals: null,
          totalEligibleDeposit: Number(row.total_profit),
          totalCommission: Number(row.amount),
          profit: Number(row.total_profit),
          commissionPercent: Number(row.commission_percent),
          amount: Number(row.amount),
          zeroReason: Number(row.amount) <= 0 ? 'No eligible referral deposit' : null,
          creditTo: row.credit_user_id
            ? {
                userId: Number(row.credit_user_id),
                userName: row.credit_user_name,
                balance: Number(row.credit_user_balance || 0),
              }
            : null,
          status: row.status,
          createdAt: row.created_at,
          isLegacy: true,
        };
      })
      .filter((row) => {
        if (currentType === 'daily') {
          return row.settlementType === 'daily';
        }
        return true;
      });

    const settlements = [...periodSettlements, ...legacySettlements]
      .filter((row) => {
        const status = String(row.status || '').toLowerCase();
        const amount = Number(row.totalCommission ?? row.amount ?? 0);
        if (status === 'pending' && amount < AFFILIATE_PENDING_THRESHOLD) return false;
        if (status === 'pending' && amount <= 0) return false;
        return true;
      })
      .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.json({ settlements, currentSettlementType: currentType });
  } catch (error) {
    console.error('Admin settlements error:', error);
    return res.status(500).json({ error: 'Failed to load settlements' });
  }
}

export async function runAdminSettlement(req, res) {
  try {
    const result = await runSettlementForActivePeriod();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Run settlement error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to run settlement',
    });
  }
}

export async function completeAdminSettlement(req, res) {
  const settlementId = Number(req.body.settlementId);
  const source = String(req.body.source || 'period').trim().toLowerCase();
  const adminId = Number(req.admin?.sub) || null;

  if (!settlementId) {
    return res.status(400).json({ error: 'Settlement ID is required' });
  }

  try {
    const result = source === 'legacy'
      ? await completeSettlement(settlementId)
      : await completePeriodSettlement(settlementId, adminId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Complete settlement error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to complete settlement',
    });
  }
}

export async function rejectAdminSettlement(req, res) {
  const settlementId = Number(req.body.settlementId);
  const source = String(req.body.source || 'period').trim().toLowerCase();

  if (!settlementId) {
    return res.status(400).json({ error: 'Settlement ID is required' });
  }

  try {
    if (source === 'legacy') {
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [[settlement]] = await connection.query(
          `SELECT * FROM settlement_history WHERE id = ? FOR UPDATE`,
          [settlementId],
        );

        if (!settlement) {
          await connection.rollback();
          return res.status(404).json({ error: 'Settlement not found' });
        }

        if (settlement.status === 'completed' || settlement.status === 'released') {
          await connection.rollback();
          return res.status(400).json({ error: 'Completed settlement cannot be rejected' });
        }

        await connection.query(
          `UPDATE settlement_history SET status = 'rejected' WHERE id = ?`,
          [settlementId],
        );

        if (settlement.status === 'pending') {
          await connection.query(
            `UPDATE affiliate_profiles
             SET pending_commission = GREATEST(pending_commission - ?, 0),
                 total_commission = GREATEST(total_commission - ?, 0)
             WHERE id = ?`,
            [settlement.amount, settlement.amount, settlement.affiliate_id],
          );
        }

        await connection.commit();
        await refreshAffiliateStats(settlement.affiliate_id);
        return res.json({ success: true, message: 'Settlement rejected' });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    await rejectPeriodSettlement(settlementId);
    return res.json({ success: true, message: 'Settlement rejected' });
  } catch (error) {
    console.error('Reject settlement error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject settlement',
    });
  }
}

export async function changeAffiliatePassword(req, res) {
  const pool = getPool();
  const affiliateId = Number(req.body.affiliateId);
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!affiliateId) {
    return res.status(400).json({ error: 'Affiliate ID is required' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const [[affiliate]] = await pool.query(
      `SELECT user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
      [affiliateId],
    );

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const passwordHash = await hashPassword(newPassword);

    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      passwordHash,
      affiliate.user_id,
    ]);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change affiliate password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

export async function getAdminWithdrawRequests(req, res) {
  const pool = getPool();

  try {
    const [rows] = await pool.query(
      `SELECT
         wr.id,
         wr.affiliate_id,
         u.name AS affiliate_name,
         ap.referral_code,
         wr.amount,
         wr.method,
         wr.account_number,
         wr.status,
         wr.created_at
       FROM affiliate_withdraw_requests wr
       INNER JOIN affiliate_profiles ap ON ap.id = wr.affiliate_id
       INNER JOIN users u ON u.id = ap.user_id
       ORDER BY wr.created_at DESC`,
    );

    return res.json({
      requests: rows.map((row) => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        affiliateName: row.affiliate_name,
        referralCode: row.referral_code,
        amount: Number(row.amount),
        method: row.method,
        accountNumber: row.account_number,
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin withdraw requests error:', error);
    return res.status(500).json({ error: 'Failed to load withdraw requests' });
  }
}

export async function updateWithdrawRequestStatus(req, res) {
  const pool = getPool();
  const requestId = Number(req.body.requestId);
  const status = String(req.body.status || '').trim();

  if (!requestId || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid request or status' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[request]] = await connection.query(
      `SELECT * FROM affiliate_withdraw_requests WHERE id = ? FOR UPDATE`,
      [requestId],
    );

    if (!request) {
      await connection.rollback();
      return res.status(404).json({ error: 'Withdraw request not found' });
    }

    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Request already processed' });
    }

    await connection.query(
      `UPDATE affiliate_withdraw_requests SET status = ? WHERE id = ?`,
      [status, requestId],
    );

    if (status === 'rejected') {
      await connection.query(
        `UPDATE affiliate_profiles
         SET settled_commission = settled_commission + ?
         WHERE id = ?`,
        [request.amount, request.affiliate_id],
      );
    }

    await connection.commit();

    return res.json({ success: true, message: `Withdraw request ${status}` });
  } catch (error) {
    await connection.rollback();
    console.error('Update withdraw request error:', error);
    return res.status(500).json({ error: 'Failed to update withdraw request' });
  } finally {
    connection.release();
  }
}

export async function getReferralStatistics(req, res) {
  try {
    const data = await getAdminReferralStatistics();
    return res.json(data);
  } catch (error) {
    console.error('Referral statistics error:', error);
    return res.status(500).json({ error: 'Failed to load referral statistics' });
  }
}

export async function createAdminAffiliate(req, res) {
  const pool = getPool();
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const password = String(req.body.password || '123456');
  const commissionPercent = Number(req.body.commissionPercent || 25);
  const status = String(req.body.status || 'approved');

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(`SELECT id FROM users WHERE phone = ? LIMIT 1`, [
      phone,
    ]);

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'Phone already registered' });
    }

    const passwordHash = await hashPassword(password);

    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, phone, password_hash, role, balance, status)
       VALUES (?, NULL, ?, ?, 'user', 0, 'active')`,
      [name, phone, passwordHash],
    );

    await connection.commit();

    await ensureUserWallet(userResult.insertId);
    await ensureAffiliateZeroTurnover(userResult.insertId);
    const profile = await createAffiliateProfile(userResult.insertId, null, null, {
      registeredAsAffiliate: true,
    });

    await pool.query(
      `UPDATE affiliate_profiles
       SET commission_percent = ?, status = ?
       WHERE id = ?`,
      [commissionPercent, status, profile.id],
    );

    return res.status(201).json({
      success: true,
      affiliate: {
        id: profile.id,
        referralCode: profile.referralCode,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create affiliate error:', error);
    return res.status(500).json({ error: 'Failed to create affiliate' });
  } finally {
    connection.release();
  }
}

export default getAdminAffiliateUsers;
