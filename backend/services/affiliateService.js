import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import {
  creditAffiliateUserBalance,
  debitAffiliateUserBalance,
  getAffiliateUserId,
  syncExistingSettledCommissionToUserBalance,
  syncAllAffiliateUsersZeroTurnover,
} from './affiliateUserBalanceService.js';
import { generateUniqueReferralCode } from '../utils/referralCode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getAffiliateSettings() {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM affiliate_settings ORDER BY id ASC LIMIT 1`);
  return (
    rows[0] ?? {
      default_commission_percent: 25,
      settlement_day: 0,
      settlement_type: 'weekly',
      auto_settlement: 1,
    }
  );
}

export async function findAffiliateByReferralCode(referralCode) {
  const pool = getPool();
  const code = String(referralCode || '').trim().toUpperCase();
  if (!code) return null;

  const [rows] = await pool.query(
    `SELECT id, user_id, referral_code, status
     FROM affiliate_profiles
     WHERE referral_code = ?
     LIMIT 1`,
    [code],
  );

  return rows[0] ?? null;
}

export async function createAffiliateProfile(
  userId,
  referredByAffiliateId = null,
  connection = null,
  options = {},
) {
  const { registeredAsAffiliate = false } = options;
  const pool = connection || getPool();
  const settings = await getAffiliateSettings();
  const referralCode = await generateUniqueReferralCode(getPool());

  const [result] = await pool.query(
    `INSERT INTO affiliate_profiles
      (user_id, referral_code, referred_by, commission_percent, status, registered_as_affiliate)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [
      userId,
      referralCode,
      referredByAffiliateId,
      settings.default_commission_percent,
      registeredAsAffiliate ? 1 : 0,
    ],
  );

  if (referredByAffiliateId) {
    await pool.query(
      `UPDATE affiliate_profiles
       SET total_referrals = total_referrals + 1
       WHERE id = ?`,
      [referredByAffiliateId],
    );
  }

  return {
    id: result.insertId,
    referralCode,
  };
}

export async function getUserTransactionMetrics(userId, dateFrom = null, dateTo = null) {
  const pool = getPool();
  const txParams = [userId];
  const agentParams = [userId];
  let txDateFilter = '';
  let agentDateFilter = '';

  if (dateFrom) {
    txDateFilter += ' AND created_at >= ?';
    agentDateFilter += ' AND created_at >= ?';
    txParams.push(dateFrom);
    agentParams.push(dateFrom);
  }

  if (dateTo) {
    txDateFilter += ' AND created_at <= ?';
    agentDateFilter += ' AND created_at <= ?';
    txParams.push(dateTo);
    agentParams.push(dateTo);
  }

  const [[metrics]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE
         WHEN type = 'deposit' AND status = 'approved' THEN amount
         WHEN type = 'adjustment' AND status = 'approved' AND amount > 0 THEN amount
         ELSE 0
       END), 0) AS totalDeposit,
       COALESCE(SUM(CASE WHEN type = 'withdraw' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalWithdraw,
       COALESCE(SUM(CASE WHEN type = 'bonus' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalBonus,
       COALESCE(SUM(CASE WHEN type = 'adjustment' AND status = 'approved' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS totalRebate
     FROM transactions
     WHERE user_id = ?${txDateFilter}`,
    txParams,
  );

  const [[agentMetrics]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE
         WHEN type IN ('deposit', 'topup_player') AND status IN ('approved', 'completed') THEN amount
         ELSE 0
       END), 0) AS agentTopupDeposit,
       COALESCE(SUM(CASE
         WHEN type = 'withdraw' AND status IN ('approved', 'completed') THEN amount
         ELSE 0
       END), 0) AS agentWithdraw
     FROM agent_transactions
     WHERE user_id = ?${agentDateFilter}`,
    agentParams,
  );

  const deposit = Number(metrics.totalDeposit) + Number(agentMetrics.agentTopupDeposit || 0);
  const withdraw = Number(metrics.totalWithdraw) + Number(agentMetrics.agentWithdraw || 0);
  const bonus = Number(metrics.totalBonus);
  const rebate = Number(metrics.totalRebate);
  const turnover = deposit + withdraw;
  const userLoss = Math.max(0, deposit - withdraw);
  const netProfit = Math.max(0, userLoss - bonus - rebate);

  return {
    totalDeposit: deposit,
    totalWithdraw: withdraw,
    totalTurnover: turnover,
    totalBonus: bonus,
    totalRebate: rebate,
    userLoss,
    netProfit,
    profitLoss: deposit - withdraw,
  };
}

export async function refreshAffiliateStats(affiliateId) {
  const pool = getPool();

  const [referrals] = await pool.query(
    `SELECT u.id AS user_id
     FROM affiliate_profiles ap
     INNER JOIN affiliate_profiles child ON child.referred_by = ap.id
     INNER JOIN users u ON u.id = child.user_id
     WHERE ap.id = ?`,
    [affiliateId],
  );

  let totalDeposit = 0;
  let totalWithdraw = 0;
  let totalTurnover = 0;
  let totalProfitLoss = 0;

  for (const referral of referrals) {
    const metrics = await getUserTransactionMetrics(referral.user_id);
    totalDeposit += metrics.totalDeposit;
    totalWithdraw += metrics.totalWithdraw;
    totalTurnover += metrics.totalTurnover;
    totalProfitLoss += metrics.profitLoss;
  }

  const [[{ totalCommission }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalCommission
     FROM settlement_history
     WHERE affiliate_id = ? AND status IN ('released', 'completed')`,
    [affiliateId],
  );

  const [[{ pendingCommission }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS pendingCommission
     FROM settlement_history
     WHERE affiliate_id = ? AND status = 'pending'`,
    [affiliateId],
  );

  await pool.query(
    `UPDATE affiliate_profiles
     SET total_referrals = ?,
         total_deposit = ?,
         total_withdraw = ?,
         total_turnover = ?,
         total_profit_loss = ?,
         total_commission = ?,
         pending_commission = ?,
         settled_commission = ?
     WHERE id = ?`,
    [
      referrals.length,
      totalDeposit,
      totalWithdraw,
      totalTurnover,
      totalProfitLoss,
      Number(totalCommission) + Number(pendingCommission),
      pendingCommission,
      totalCommission,
      affiliateId,
    ],
  );
}

export function getWeekRange(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(date.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
  };
}

export async function calculateWeeklyCommission(affiliateId, weekStart, weekEnd) {
  const pool = getPool();

  const [[affiliate]] = await pool.query(
    `SELECT commission_percent FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );

  if (!affiliate) {
    throw new Error('Affiliate not found');
  }

  const [referrals] = await pool.query(
    `SELECT u.id AS user_id
     FROM affiliate_profiles child
     INNER JOIN users u ON u.id = child.user_id
     WHERE child.referred_by = ?`,
    [affiliateId],
  );

  let totalProfit = 0;

  for (const referral of referrals) {
    const metrics = await getUserTransactionMetrics(
      referral.user_id,
      `${weekStart} 00:00:00`,
      `${weekEnd} 23:59:59`,
    );
    totalProfit += metrics.netProfit;
  }

  const commissionPercent = Number(affiliate.commission_percent);
  const amount = Number(((totalProfit * commissionPercent) / 100).toFixed(2));

  return {
    totalProfit,
    commissionPercent,
    amount,
  };
}

export async function runAffiliateSettlement(affiliateId, weekStart, weekEnd, status = 'pending') {
  const pool = getPool();
  const { totalProfit, commissionPercent, amount } = await calculateWeeklyCommission(
    affiliateId,
    weekStart,
    weekEnd,
  );

  const [existing] = await pool.query(
    `SELECT id FROM settlement_history
     WHERE affiliate_id = ? AND week_start = ? AND week_end = ?
     LIMIT 1`,
    [affiliateId, weekStart, weekEnd],
  );

  if (existing.length) {
    return { skipped: true, reason: 'Settlement already exists for this week' };
  }

  const [result] = await pool.query(
    `INSERT INTO settlement_history
      (affiliate_id, week_start, week_end, total_profit, commission_percent, amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [affiliateId, weekStart, weekEnd, totalProfit, commissionPercent, amount, status],
  );

  if (status === 'released' || status === 'completed') {
    await pool.query(
      `UPDATE affiliate_profiles
       SET settled_commission = settled_commission + ?,
           pending_commission = GREATEST(pending_commission - ?, 0)
       WHERE id = ?`,
      [amount, amount, affiliateId],
    );

    const userId = await getAffiliateUserId(affiliateId);
    if (userId) {
      await creditAffiliateUserBalance(userId, amount);
    }
  } else if (status === 'pending') {
    await pool.query(
      `UPDATE affiliate_profiles
       SET pending_commission = pending_commission + ?,
           total_commission = total_commission + ?
       WHERE id = ?`,
      [amount, amount, affiliateId],
    );
  }

  await refreshAffiliateStats(affiliateId);

  return {
    id: result.insertId,
    totalProfit,
    commissionPercent,
    amount,
    status,
  };
}

export async function completeSettlement(settlementId) {
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
      throw new Error('Settlement not found');
    }

    if (settlement.status === 'released' || settlement.status === 'completed') {
      await connection.rollback();
      return { alreadyReleased: true };
    }

    await connection.query(
      `UPDATE settlement_history SET status = 'released' WHERE id = ?`,
      [settlementId],
    );

    await connection.query(
      `UPDATE affiliate_profiles
       SET settled_commission = settled_commission + ?,
           pending_commission = GREATEST(pending_commission - ?, 0)
       WHERE id = ?`,
      [settlement.amount, settlement.amount, settlement.affiliate_id],
    );

    const userId = await getAffiliateUserId(settlement.affiliate_id, connection);
    if (userId) {
      await creditAffiliateUserBalance(userId, settlement.amount, connection);
    }

    await connection.commit();
    await refreshAffiliateStats(settlement.affiliate_id);

    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function migrateAffiliateSchema() {
  const pool = getPool();
  const sqlFiles = [
    'affiliate_profiles.sql',
    'affiliate_settings.sql',
    'settlement_history.sql',
    'affiliate_withdraw_requests.sql',
  ];

  for (const file of sqlFiles) {
    const schemaPath = path.join(__dirname, '..', 'sql', file);
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  }

  try {
    await syncExistingSettledCommissionToUserBalance();
    await syncAllAffiliateUsersZeroTurnover();
  } catch (error) {
    console.error('Affiliate settled balance sync failed:', error.message);
  }

  try {
    const { cleanupOrphanAffiliateReferralStatistics } = await import(
      './affiliateReferralStatsService.js'
    );
    const cleanup = await cleanupOrphanAffiliateReferralStatistics();
    if (Object.values(cleanup.removed).some((count) => count > 0)) {
      console.info('[affiliate] orphan referral statistics cleanup', cleanup);
    }
  } catch (error) {
    console.error('Affiliate referral statistics cleanup failed:', error.message);
  }

  try {
    await pool.query(
      `ALTER TABLE affiliate_profiles
       ADD COLUMN registered_as_affiliate TINYINT(1) NOT NULL DEFAULT 0 AFTER status`,
    );
  } catch {
    // column may exist
  }

  await pool.query(
    `UPDATE affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     SET ap.registered_as_affiliate = 1
     WHERE ap.registered_as_affiliate = 0
       AND (
         (u.email IS NOT NULL AND TRIM(u.email) <> '')
         OR ap.settlement_user_id IS NOT NULL
       )`,
  );

  try {
    await pool.query(
      `UPDATE settlement_history SET status = 'released' WHERE status = 'completed'`,
    );
    await pool.query(
      `ALTER TABLE settlement_history
       MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'released')
       NOT NULL DEFAULT 'pending'`,
    );
  } catch {
    // enum may already be migrated
  }

  const [[{ settingsCount }]] = await pool.query(
    `SELECT COUNT(*) AS settingsCount FROM affiliate_settings`,
  );

  if (Number(settingsCount) === 0) {
    await pool.query(
      `INSERT INTO affiliate_settings (default_commission_percent, settlement_day, auto_settlement)
       VALUES (25.00, 0, 1)`,
    );
  }

  const [usersWithoutProfile] = await pool.query(
    `SELECT u.id
     FROM users u
     LEFT JOIN affiliate_profiles ap ON ap.user_id = u.id
     WHERE ap.id IS NULL AND u.role = 'user'`,
  );

  for (const user of usersWithoutProfile) {
    await createAffiliateProfile(user.id);
  }
}

export default migrateAffiliateSchema;
