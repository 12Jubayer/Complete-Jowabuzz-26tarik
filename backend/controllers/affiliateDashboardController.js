import { getPool } from '../config/db.js';
import {
  getAffiliateBalanceSnapshot,
  syncAvailableToPendingSettlement,
} from '../services/affiliateBalanceService.js';
import {
  SETTLEMENT_USER_INVALID_MSG,
  setAffiliateSettlementUserId,
} from '../services/affiliateSettlementUserService.js';
import {
  getUserTransactionMetrics,
  refreshAffiliateStats,
} from '../services/affiliateService.js';

function getAffiliateId(req) {
  return Number(req.affiliate?.sub);
}

export async function getAffiliateDashboard(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    await refreshAffiliateStats(affiliateId);

    const poolConn = await pool.getConnection();
    try {
      await poolConn.beginTransaction();
      await syncAvailableToPendingSettlement(affiliateId, poolConn);
      await poolConn.commit();
    } catch (syncErr) {
      await poolConn.rollback();
      console.error('Affiliate balance sync warning:', syncErr.message);
    } finally {
      poolConn.release();
    }

    const balances = await getAffiliateBalanceSnapshot(affiliateId);

    const [[profile]] = await pool.query(
      `SELECT
         ap.*,
         u.name,
         u.phone,
         u.email,
         u.balance AS user_balance
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE ap.id = ?
       LIMIT 1`,
      [affiliateId],
    );

    if (!profile) {
      return res.status(404).json({ error: 'Affiliate profile not found' });
    }

    const [weeklyRows] = await pool.query(
      `SELECT week_start, week_end, amount, status
       FROM settlement_history
       WHERE affiliate_id = ?
         AND week_start >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)
       ORDER BY week_start ASC`,
      [affiliateId],
    );

    const weeklyEarnings = weeklyRows.map((row) => ({
      week: `${row.week_start}`,
      amount: Number(row.amount),
      status: row.status,
    }));

    const [referralGrowth] = await pool.query(
      `SELECT DATE(u.created_at) AS day, COUNT(*) AS count
       FROM affiliate_profiles child
       INNER JOIN users u ON u.id = child.user_id
       WHERE child.referred_by = ?
         AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(u.created_at)
       ORDER BY day ASC`,
      [affiliateId],
    );

    return res.json({
      totalReferrals: Number(profile.total_referrals),
      availableBalance: balances.availableBalance,
      pendingBalance: balances.pendingBalance,
      totalBalance: balances.totalBalance,
      referralCode: profile.referral_code,
      status: profile.status,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      charts: {
        weeklyEarnings,
        referralStatistics: referralGrowth.map((row) => ({
          day: row.day,
          count: Number(row.count),
        })),
      },
    });
  } catch (error) {
    console.error('Affiliate dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
}

export async function getAffiliateReferrals(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    const [rows] = await pool.query(
      `SELECT
         u.id AS userId,
         u.name AS username,
         u.phone,
         u.created_at AS registrationDate,
         child.id AS affiliateProfileId
       FROM affiliate_profiles child
       INNER JOIN users u ON u.id = child.user_id
       WHERE child.referred_by = ?
       ORDER BY u.created_at DESC`,
      [affiliateId],
    );

    const [[affiliate]] = await pool.query(
      `SELECT commission_percent FROM affiliate_profiles WHERE id = ? LIMIT 1`,
      [affiliateId],
    );

    const commissionPercent = Number(affiliate?.commission_percent || 0);

    const referrals = await Promise.all(
      rows.map(async (row) => {
        const metrics = await getUserTransactionMetrics(row.userId);
        const generatedCommission = Number(
          ((metrics.netProfit * commissionPercent) / 100).toFixed(2),
        );

        return {
          userId: row.userId,
          username: row.username,
          phone: row.phone,
          registrationDate: row.registrationDate,
          deposit: metrics.totalDeposit,
          turnover: metrics.totalTurnover,
          profitLoss: metrics.profitLoss,
          generatedCommission,
        };
      }),
    );

    return res.json({ referrals });
  } catch (error) {
    console.error('Affiliate referrals error:', error);
    return res.status(500).json({ error: 'Failed to load referrals' });
  }
}

export async function getAffiliateCommission(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    const [[profile]] = await pool.query(
      `SELECT total_commission, pending_commission, settled_commission
       FROM affiliate_profiles WHERE id = ? LIMIT 1`,
      [affiliateId],
    );

    if (!profile) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const [settlements] = await pool.query(
      `SELECT week_start, week_end, total_profit, amount, status, created_at
       FROM settlement_history
       WHERE affiliate_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [affiliateId],
    );

    return res.json({
      totalCommission: Number(profile.total_commission),
      pendingCommission: Number(profile.pending_commission),
      settledCommission: Number(profile.settled_commission),
      recentSettlements: settlements.map((row) => ({
        weekStart: row.week_start,
        weekEnd: row.week_end,
        totalProfit: Number(row.total_profit),
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Affiliate commission error:', error);
    return res.status(500).json({ error: 'Failed to load commission data' });
  }
}

export async function getAffiliateSettlements(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    const [periodRows] = await pool.query(
      `SELECT
         s.id,
         s.total_referrals,
         s.total_commission,
         s.total_profit,
         s.status,
         s.settlement_user_id,
         s.approved_at,
         s.created_at,
         su.provider_username AS settlement_user_public_id,
         p.name AS period_name,
         p.settlement_type,
         p.start_date,
         p.end_date
       FROM affiliate_settlements s
       INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
       LEFT JOIN users su ON su.id = s.settlement_user_id
       WHERE s.affiliate_id = ?
       ORDER BY s.created_at DESC`,
      [affiliateId],
    );

    const [weeklyRows] = await pool.query(
      `SELECT sh.id, sh.week_start, sh.week_end, sh.total_profit, sh.amount, sh.status,
              sh.settlement_user_id, sh.approved_at, sh.created_at,
              su.provider_username AS settlement_user_public_id
       FROM settlement_history sh
       LEFT JOIN users su ON su.id = sh.settlement_user_id
       WHERE sh.affiliate_id = ?
         AND NOT EXISTS (
           SELECT 1
           FROM affiliate_settlements s
           INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
           WHERE s.affiliate_id = settlement_history.affiliate_id
             AND p.start_date = settlement_history.week_start
             AND p.end_date = settlement_history.week_end
         )
       ORDER BY created_at DESC`,
      [affiliateId],
    );

    const [adjustmentRows] = await pool.query(
      `SELECT id, type, amount, reason, status, created_at
       FROM affiliate_transactions
       WHERE affiliate_id = ? AND type IN ('add', 'deduct')
       ORDER BY created_at DESC`,
      [affiliateId],
    );

    const periodSettlements = periodRows.map((row) => ({
      id: `p-${row.id}`,
      recordType: 'period_settlement',
      settlementType: row.settlement_type || (String(row.start_date).slice(0, 10) === String(row.end_date).slice(0, 10) ? 'daily' : 'weekly'),
      settlementName: row.period_name,
      weekRange: row.settlement_type === 'daily'
        ? String(row.start_date).slice(0, 10)
        : row.period_name,
      dateRange: row.settlement_type === 'daily'
        ? String(row.start_date).slice(0, 10)
        : `${String(row.start_date).slice(0, 10)} – ${String(row.end_date).slice(0, 10)}`,
      weekStart: row.start_date,
      weekEnd: row.end_date,
      profit: Number(row.total_profit),
      totalReferrals: Number(row.total_referrals),
      amount: Number(row.total_commission),
      settlementUserId: row.settlement_user_public_id || null,
      approvedAt: row.approved_at || null,
      status: row.status === 'settled' ? 'released' : row.status,
      createdAt: row.created_at,
    }));

    const weekly = weeklyRows.map((row) => ({
      id: `s-${row.id}`,
      recordType: 'weekly_settlement',
      weekStart: row.week_start,
      weekEnd: row.week_end,
      profit: Number(row.total_profit),
      amount: Number(row.amount),
      settlementUserId: row.settlement_user_public_id || null,
      approvedAt: row.approved_at || null,
      status: row.status,
      createdAt: row.created_at,
    }));

    const adjustments = adjustmentRows.map((row) => ({
      id: `t-${row.id}`,
      recordType: 'admin_adjustment',
      typeLabel: row.type === 'add' ? 'Admin Balance Adjustment' : 'Admin Balance Deduction',
      note: row.reason,
      adjustmentType: row.type,
      amount: Number(row.amount),
      status: row.status === 'completed' ? 'completed' : row.status,
      createdAt: row.created_at,
    }));

    const settlements = [...periodSettlements, ...weekly, ...adjustments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.json({ settlements });
  } catch (error) {
    console.error('Affiliate settlements error:', error);
    return res.status(500).json({ error: 'Failed to load settlements' });
  }
}

export async function getAffiliateProfile(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    const [[profile]] = await pool.query(
      `SELECT
         ap.id,
         ap.user_id,
         ap.referral_code,
         ap.status,
         ap.created_at,
         ap.settlement_user_id,
         u.name,
         u.phone,
         u.email,
         su.name AS settlement_user_name,
         su.provider_username AS settlement_user_public_id
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       LEFT JOIN users su ON su.id = ap.settlement_user_id
       WHERE ap.id = ?
       LIMIT 1`,
      [affiliateId],
    );

    if (!profile) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const mainSiteUrl = String(process.env.SITE_URL || process.env.APP_URL || '').trim().replace(/\/$/, '')
      || `http://localhost:${process.env.PORT || 3001}`;

    return res.json({
      id: profile.id,
      userId: profile.user_id,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      referralCode: profile.referral_code,
      mainSiteUrl,
      settlementUserId: profile.settlement_user_public_id || null,
      settlementUserName: profile.settlement_user_name || null,
      status: profile.status,
      createdAt: profile.created_at,
    });
  } catch (error) {
    console.error('Affiliate profile error:', error);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}

export async function updateAffiliateSettlementUser(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);
  const settlementUserId = req.body.settlementUserId ?? req.body.settlement_user_id;

  if (settlementUserId === undefined || settlementUserId === null || settlementUserId === '') {
    return res.status(400).json({ error: SETTLEMENT_USER_INVALID_MSG });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[affiliate]] = await connection.query(
      `SELECT user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
      [affiliateId],
    );

    if (!affiliate) {
      await connection.rollback();
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const result = await setAffiliateSettlementUserId({
      affiliateId,
      settlementUserId,
      excludeUserId: affiliate.user_id,
      changedByAffiliateId: affiliateId,
      connection,
    });

    await connection.commit();

    return res.json({
      success: true,
      settlementUserId: result.settlementUserId,
      settlementUserName: result.settlementUserName,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update affiliate settlement user error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update settlement User ID',
    });
  } finally {
    connection.release();
  }
}

export default getAffiliateDashboard;
