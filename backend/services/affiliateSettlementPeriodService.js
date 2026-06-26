import { getPool } from '../config/db.js';
import {
  creditAffiliateUserBalance,
  getAffiliateUserId,
} from './affiliateUserBalanceService.js';
import {
  AFFILIATE_PENDING_THRESHOLD,
  completeAvailableBalanceSettlement,
  rejectAvailableBalanceSettlement,
  syncAvailableToPendingSettlement,
} from './affiliateBalanceService.js';
import { creditAffiliateSettlementPayout } from './affiliateSettlementUserService.js';
import {
  getAffiliateSettings,
  refreshAffiliateStats,
} from './affiliateService.js';
import { calculateDateWiseCommission } from './affiliateCommissionPeriodService.js';
import { logWalletTransaction } from './walletTransactionService.js';
import { getSettlementWindowForSettings } from './affiliateSettlementBarService.js';

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validatePeriodDates(startDate, endDate) {
  const start = String(startDate || '').trim();
  const end = String(endDate || '').trim();

  if (!start || !end) {
    const error = new Error('Start date and end date are required');
    error.statusCode = 400;
    throw error;
  }

  if (start > end) {
    const error = new Error('Start date cannot be after end date');
    error.statusCode = 400;
    throw error;
  }

  return { startDate: start, endDate: end };
}

export async function listSettlementPeriods() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, name, start_date, end_date, commission_percent, is_active, created_at
     FROM affiliate_settlement_periods
     ORDER BY start_date DESC, id DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    commissionPercent: Number(row.commission_percent),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }));
}

export async function getActiveSettlementPeriod(connection = null) {
  const pool = connection || getPool();
  const [[row]] = await pool.query(
    `SELECT id, name, start_date, end_date, commission_percent, is_active, created_at
     FROM affiliate_settlement_periods
     WHERE is_active = 1
     ORDER BY id DESC
     LIMIT 1`,
  );

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    commissionPercent: Number(row.commission_percent),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export async function createSettlementPeriod(payload) {
  const pool = getPool();
  const name = String(payload.name || '').trim();
  const commissionPercent = Number(payload.commissionPercent ?? payload.commission_percent);
  const isActive = Boolean(payload.isActive ?? payload.is_active);
  const { startDate, endDate } = validatePeriodDates(payload.startDate ?? payload.start_date, payload.endDate ?? payload.end_date);

  if (!name) {
    const error = new Error('Settlement name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    const error = new Error('Commission percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (isActive) {
      await connection.query(`UPDATE affiliate_settlement_periods SET is_active = 0`);
    }

    const [result] = await connection.query(
      `INSERT INTO affiliate_settlement_periods
        (name, start_date, end_date, commission_percent, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, startDate, endDate, commissionPercent, isActive ? 1 : 0],
    );

    await connection.commit();

    return {
      id: result.insertId,
      name,
      startDate,
      endDate,
      commissionPercent,
      isActive,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateSettlementPeriod(periodId, payload) {
  const pool = getPool();
  const name = String(payload.name || '').trim();
  const commissionPercent = Number(payload.commissionPercent ?? payload.commission_percent);
  const isActive = payload.isActive ?? payload.is_active;
  const hasDates = payload.startDate || payload.start_date || payload.endDate || payload.end_date;

  if (!periodId) {
    const error = new Error('Invalid period id');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT * FROM affiliate_settlement_periods WHERE id = ? FOR UPDATE`,
      [periodId],
    );

    if (!existing) {
      const error = new Error('Settlement period not found');
      error.statusCode = 404;
      throw error;
    }

    const startDate = payload.startDate ?? payload.start_date ?? formatDate(existing.start_date);
    const endDate = payload.endDate ?? payload.end_date ?? formatDate(existing.end_date);
    validatePeriodDates(startDate, endDate);

    if (name && !name.trim()) {
      const error = new Error('Settlement name is required');
      error.statusCode = 400;
      throw error;
    }

    if (payload.commissionPercent !== undefined || payload.commission_percent !== undefined) {
      if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
        const error = new Error('Commission percentage must be between 0 and 100');
        error.statusCode = 400;
        throw error;
      }
    }

    if (isActive === true) {
      await connection.query(`UPDATE affiliate_settlement_periods SET is_active = 0`);
    }

    await connection.query(
      `UPDATE affiliate_settlement_periods
       SET name = ?, start_date = ?, end_date = ?, commission_percent = ?, is_active = ?
       WHERE id = ?`,
      [
        name || existing.name,
        startDate,
        endDate,
        payload.commissionPercent !== undefined || payload.commission_percent !== undefined
          ? commissionPercent
          : existing.commission_percent,
        isActive === undefined ? existing.is_active : isActive ? 1 : 0,
        periodId,
      ],
    );

    await connection.commit();
    return getActiveSettlementPeriod();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function activateSettlementPeriod(periodId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT id FROM affiliate_settlement_periods WHERE id = ? LIMIT 1`,
      [periodId],
    );

    if (!existing) {
      const error = new Error('Settlement period not found');
      error.statusCode = 404;
      throw error;
    }

    await connection.query(`UPDATE affiliate_settlement_periods SET is_active = 0`);
    await connection.query(
      `UPDATE affiliate_settlement_periods SET is_active = 1 WHERE id = ?`,
      [periodId],
    );

    await connection.commit();
    return listSettlementPeriods();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function calculatePeriodCommission(affiliateId, startDate, endDate) {
  return calculateDateWiseCommission(affiliateId, startDate, endDate);
}

export async function ensureSettlementPeriodForWindow(window) {
  const pool = getPool();
  const [[existing]] = await pool.query(
    `SELECT id FROM affiliate_settlement_periods WHERE start_date = ? AND end_date = ? LIMIT 1`,
    [window.startDate, window.endDate],
  );

  if (existing) {
    return existing.id;
  }

  const [result] = await pool.query(
    `INSERT INTO affiliate_settlement_periods
      (name, settlement_type, start_date, end_date, commission_percent, is_active)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [window.name, window.settlementType || 'weekly', window.startDate, window.endDate],
  );

  return result.insertId;
}

export async function runSettlementForPeriodWindow(periodId, window) {
  const pool = getPool();
  const period = {
    id: periodId,
    name: window.name,
    startDate: window.startDate,
    endDate: window.endDate,
  };

  const [affiliates] = await pool.query(
    `SELECT id FROM affiliate_profiles WHERE status = 'approved'`,
  );

  const results = [];
  for (const affiliate of affiliates) {
    const result = await runAffiliatePeriodSettlement(affiliate.id, period);
    results.push({ affiliateId: affiliate.id, periodId, ...result });

    if (!result.skipped) {
      console.log('[AffiliateSettlement]', JSON.stringify({
        affiliate_id: affiliate.id,
        period: `${period.startDate} to ${period.endDate}`,
        referral_count: result.totalReferrals ?? 0,
        eligible_amount: result.totalEligibleDeposit ?? 0,
        commission_percent: result.commissionPercent ?? 0,
        commission_amount: result.amount ?? 0,
        zero_reason: result.zeroReason || null,
      }));
    }
  }

  return { period, results };
}

export async function runSettlementForActivePeriod() {
  const settings = await getAffiliateSettings();
  const window = getSettlementWindowForSettings(settings);
  const periodId = await ensureSettlementPeriodForWindow(window);
  return runSettlementForPeriodWindow(periodId, window);
}

export async function runAffiliatePeriodSettlement(affiliateId, period) {
  const pool = getPool();

  const [existing] = await pool.query(
    `SELECT id, status FROM affiliate_settlements WHERE affiliate_id = ? AND period_id = ? LIMIT 1`,
    [affiliateId, period.id],
  );

  if (existing.length) {
    return {
      skipped: true,
      reason: existing[0].status === 'settled' ? 'Already settled' : 'Settlement already exists for this period',
    };
  }

  const calc = await calculatePeriodCommission(affiliateId, period.startDate, period.endDate);
  const {
    totalProfit,
    totalEligibleDeposit,
    totalReferrals,
    commissionPercent,
    amount,
    creditUserId,
    zeroReason,
  } = calc;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const meetsPendingThreshold = amount >= AFFILIATE_PENDING_THRESHOLD;
    const settlementStatus = meetsPendingThreshold ? 'pending' : 'settled';
    const historyStatus = meetsPendingThreshold ? 'pending' : 'released';

    const [result] = await connection.query(
      `INSERT INTO affiliate_settlements
        (affiliate_id, period_id, total_referrals, total_eligible_deposit, commission_percent,
         total_commission, total_profit, zero_reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        affiliateId,
        period.id,
        totalReferrals,
        totalEligibleDeposit ?? totalProfit,
        commissionPercent,
        amount,
        totalProfit,
        zeroReason,
        settlementStatus,
      ],
    );

    if (amount > 0) {
      if (meetsPendingThreshold) {
        await connection.query(
          `UPDATE affiliate_profiles
           SET pending_commission = pending_commission + ?,
               total_commission = total_commission + ?
           WHERE id = ?`,
          [amount, amount, affiliateId],
        );
      } else {
        await connection.query(
          `UPDATE affiliate_profiles
           SET available_balance = available_balance + ?,
               total_commission = total_commission + ?
           WHERE id = ?`,
          [amount, amount, affiliateId],
        );
        await syncAvailableToPendingSettlement(affiliateId, connection);
      }
    }

    await connection.query(
      `INSERT INTO settlement_history
        (affiliate_id, week_start, week_end, total_profit, commission_percent, amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        affiliateId,
        period.startDate,
        period.endDate,
        totalEligibleDeposit ?? totalProfit,
        commissionPercent,
        amount,
        historyStatus,
      ],
    );

    await connection.commit();

    return {
      id: result.insertId,
      totalProfit,
      totalEligibleDeposit: totalEligibleDeposit ?? totalProfit,
      totalReferrals,
      commissionPercent,
      amount,
      creditUserId,
      zeroReason,
      status: settlementStatus,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdminPeriodSettlements() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       s.id,
       s.affiliate_id,
       s.period_id,
       s.total_referrals,
       s.total_eligible_deposit,
       s.commission_percent AS settlement_commission_percent,
       s.total_commission,
       s.total_profit,
       s.zero_reason,
       s.status,
       s.settlement_source,
       s.approved_by,
       s.approved_at,
       s.credited_user_id,
       s.balance_before,
       s.balance_after,
       s.wallet_transaction_id,
       s.created_at,
       p.name AS period_name,
       p.settlement_type,
       p.start_date,
       p.end_date,
       u.name AS affiliate_name,
       ap.referral_code,
       ap.user_id AS affiliate_user_id,
       ap.settlement_user_id AS profile_settlement_user_id,
       COALESCE(s.settlement_user_id, s.credited_user_id, ap.settlement_user_id) AS settlement_user_id,
       cu.name AS credit_user_name,
       cu.balance AS credit_user_balance,
       au.name AS approved_by_name
     FROM affiliate_settlements s
     INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
     INNER JOIN affiliate_profiles ap ON ap.id = s.affiliate_id
     INNER JOIN users u ON u.id = ap.user_id
     LEFT JOIN users cu ON cu.id = COALESCE(s.credited_user_id, s.settlement_user_id, ap.settlement_user_id, ap.user_id)
     LEFT JOIN users au ON au.id = s.approved_by
     ORDER BY s.created_at DESC
     LIMIT 500`,
  );

  return rows.map((row) => {
    const creditUserId = row.settlement_user_id || row.credited_user_id || row.profile_settlement_user_id || row.affiliate_user_id;
    const creditUserName = row.credit_user_name || row.affiliate_name;
    const creditUserBalance = Number(row.credit_user_balance || 0);

    return {
      id: row.id,
      source: 'period',
      affiliateId: row.affiliate_id,
      affiliateName: row.affiliate_name,
      referralCode: row.referral_code,
      periodId: row.period_id,
      settlementType: row.settlement_type || (formatDate(row.start_date) === formatDate(row.end_date) ? 'daily' : 'weekly'),
      settlementName: row.period_name,
      settlementSource: row.settlement_source || 'period',
      weekRange: row.settlement_type === 'daily' ? formatDate(row.start_date) : row.period_name,
      dateRange: row.settlement_type === 'daily'
        ? formatDate(row.start_date)
        : `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`,
      startDate: formatDate(row.start_date),
      endDate: formatDate(row.end_date),
      totalReferrals: Number(row.total_referrals),
      totalEligibleDeposit: Number(row.total_eligible_deposit || row.total_profit || 0),
      totalCommission: Number(row.total_commission),
      profit: Number(row.total_profit),
      commissionPercent: Number(row.settlement_commission_percent || 0),
      amount: Number(row.total_commission),
      zeroReason: row.zero_reason || null,
      creditTo: creditUserId
        ? {
            userId: Number(creditUserId),
            userName: creditUserName,
            balance: creditUserBalance,
          }
        : null,
      creditedUserId: row.credited_user_id ? Number(row.credited_user_id) : null,
      settlementUserId: creditUserId ? Number(creditUserId) : null,
      balanceBefore: row.balance_before !== null ? Number(row.balance_before) : null,
      balanceAfter: row.balance_after !== null ? Number(row.balance_after) : null,
      walletTransactionId: row.wallet_transaction_id ? Number(row.wallet_transaction_id) : null,
      status: row.status === 'settled' ? 'released' : row.status,
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_name || null,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    };
  });
}

export async function completePeriodSettlement(settlementId, adminId = null) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[settlement]] = await connection.query(
      `SELECT s.*, p.start_date, p.end_date, p.commission_percent, p.name AS period_name
       FROM affiliate_settlements s
       INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
       WHERE s.id = ?
       FOR UPDATE`,
      [settlementId],
    );

    if (!settlement) {
      const error = new Error('Settlement not found');
      error.statusCode = 404;
      throw error;
    }

    if (settlement.status === 'settled') {
      await connection.rollback();
      return { alreadyReleased: true };
    }

    if (settlement.status === 'rejected') {
      const error = new Error('Rejected settlement cannot be approved');
      error.statusCode = 400;
      throw error;
    }

    if (settlement.settlement_source === 'available_balance') {
      const result = await completeAvailableBalanceSettlement(settlement, adminId, connection);
      await connection.commit();

      const pool2 = getPool();
      const conn2 = await pool2.getConnection();
      try {
        await conn2.beginTransaction();
        await syncAvailableToPendingSettlement(settlement.affiliate_id, conn2);
        await conn2.commit();
      } catch {
        await conn2.rollback();
      } finally {
        conn2.release();
      }

      return result;
    }

    await connection.query(
      `UPDATE affiliate_settlements
       SET status = 'settled', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [adminId, settlementId],
    );

    await connection.query(
      `UPDATE settlement_history
       SET status = 'released'
       WHERE affiliate_id = ?
         AND week_start = ?
         AND week_end = ?
         AND status = 'pending'`,
      [settlement.affiliate_id, formatDate(settlement.start_date), formatDate(settlement.end_date)],
    );

    const amount = Number(settlement.total_commission);
    let balanceBefore = null;
    let balanceAfter = null;
    let walletTransactionId = null;
    let creditedUserId = null;

    if (amount > 0) {
      await connection.query(
        `UPDATE affiliate_profiles
         SET settled_commission = settled_commission + ?,
             pending_commission = GREATEST(pending_commission - ?, 0)
         WHERE id = ?`,
        [amount, amount, settlement.affiliate_id],
      );

      const payout = await creditAffiliateSettlementPayout({
        affiliateId: settlement.affiliate_id,
        settlementId,
        amount,
        adminId,
        weekStart: formatDate(settlement.start_date),
        weekEnd: formatDate(settlement.end_date),
        connection,
      });

      creditedUserId = payout.creditedUserId;
      balanceBefore = payout.balanceBefore;
      balanceAfter = payout.balanceAfter;
      walletTransactionId = payout.walletTransactionId;
    } else {
      await connection.query(
        `UPDATE affiliate_settlements
         SET credited_user_id = NULL, balance_before = NULL, balance_after = NULL, wallet_transaction_id = NULL
         WHERE id = ?`,
        [settlementId],
      );
    }

    await connection.commit();
    await refreshAffiliateStats(settlement.affiliate_id);

    return {
      success: true,
      creditedUserId,
      balanceBefore,
      balanceAfter,
      amount,
      walletTransactionId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectPeriodSettlement(settlementId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[settlement]] = await connection.query(
      `SELECT s.*, p.start_date, p.end_date
       FROM affiliate_settlements s
       INNER JOIN affiliate_settlement_periods p ON p.id = s.period_id
       WHERE s.id = ?
       FOR UPDATE`,
      [settlementId],
    );

    if (!settlement) {
      const error = new Error('Settlement not found');
      error.statusCode = 404;
      throw error;
    }

    if (settlement.status === 'settled') {
      const error = new Error('Settled settlement cannot be rejected');
      error.statusCode = 400;
      throw error;
    }

    if (settlement.settlement_source === 'available_balance') {
      const result = await rejectAvailableBalanceSettlement(settlement, connection);
      await connection.commit();
      const pool2 = getPool();
      const conn2 = await pool2.getConnection();
      try {
        await conn2.beginTransaction();
        await syncAvailableToPendingSettlement(settlement.affiliate_id, conn2);
        await conn2.commit();
      } catch {
        await conn2.rollback();
      } finally {
        conn2.release();
      }
      return result;
    }

    await connection.query(
      `UPDATE affiliate_settlements SET status = 'rejected' WHERE id = ?`,
      [settlementId],
    );

    await connection.query(
      `UPDATE settlement_history
       SET status = 'rejected'
       WHERE affiliate_id = ?
         AND week_start = ?
         AND week_end = ?
         AND status = 'pending'`,
      [settlement.affiliate_id, formatDate(settlement.start_date), formatDate(settlement.end_date)],
    );

    const amount = Number(settlement.total_commission);

    if (settlement.status === 'pending' && amount > 0) {
      await connection.query(
        `UPDATE affiliate_profiles
         SET pending_commission = GREATEST(pending_commission - ?, 0),
             total_commission = GREATEST(total_commission - ?, 0)
         WHERE id = ?`,
        [amount, amount, settlement.affiliate_id],
      );
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

export async function migrateSettlementPeriodSchema() {
  const pool = getPool();
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  for (const file of ['affiliate_settlement_periods.sql', 'affiliate_settlements.sql']) {
    const schemaPath = path.join(__dirname, '..', 'sql', file);
    if (!fs.existsSync(schemaPath)) continue;
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
  }
}
