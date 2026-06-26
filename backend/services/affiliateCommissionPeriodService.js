import { getPool } from '../config/db.js';
import { getAffiliateSettings, getUserTransactionMetrics } from './affiliateService.js';

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
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

export async function getDefaultCommissionPercent() {
  const settings = await getAffiliateSettings();
  return Number(settings.default_commission_percent || 25);
}

export async function listCommissionPeriods() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, start_date, end_date, commission_percent, is_active, created_at
     FROM affiliate_commission_periods
     ORDER BY start_date DESC, id DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    commissionPercent: Number(row.commission_percent),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }));
}

export async function createCommissionPeriod(payload) {
  const pool = getPool();
  const commissionPercent = Number(payload.commissionPercent ?? payload.commission_percent);
  const isActive = payload.isActive === undefined ? true : Boolean(payload.isActive ?? payload.is_active);
  const { startDate, endDate } = validatePeriodDates(
    payload.startDate ?? payload.start_date,
    payload.endDate ?? payload.end_date,
  );

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    const error = new Error('Commission percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.query(
    `INSERT INTO affiliate_commission_periods
      (start_date, end_date, commission_percent, is_active)
     VALUES (?, ?, ?, ?)`,
    [startDate, endDate, commissionPercent, isActive ? 1 : 0],
  );

  return {
    id: result.insertId,
    startDate,
    endDate,
    commissionPercent,
    isActive,
  };
}

export async function updateCommissionPeriod(periodId, payload) {
  const pool = getPool();

  const [[existing]] = await pool.query(
    `SELECT * FROM affiliate_commission_periods WHERE id = ? LIMIT 1`,
    [periodId],
  );

  if (!existing) {
    const error = new Error('Commission period not found');
    error.statusCode = 404;
    throw error;
  }

  const startDate = payload.startDate ?? payload.start_date ?? formatDate(existing.start_date);
  const endDate = payload.endDate ?? payload.end_date ?? formatDate(existing.end_date);
  validatePeriodDates(startDate, endDate);

  const commissionPercent =
    payload.commissionPercent !== undefined || payload.commission_percent !== undefined
      ? Number(payload.commissionPercent ?? payload.commission_percent)
      : Number(existing.commission_percent);

  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    const error = new Error('Commission percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  const isActive =
    payload.isActive === undefined && payload.is_active === undefined
      ? Boolean(existing.is_active)
      : Boolean(payload.isActive ?? payload.is_active);

  await pool.query(
    `UPDATE affiliate_commission_periods
     SET start_date = ?, end_date = ?, commission_percent = ?, is_active = ?
     WHERE id = ?`,
    [startDate, endDate, commissionPercent, isActive ? 1 : 0, periodId],
  );

  return listCommissionPeriods();
}

export async function getActiveCommissionPeriodsForRange(startDate, endDate) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, start_date, end_date, commission_percent, is_active
     FROM affiliate_commission_periods
     WHERE is_active = 1
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY start_date ASC`,
    [endDate, startDate],
  );

  return rows.map((row) => ({
    id: row.id,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    commissionPercent: Number(row.commission_percent),
    isActive: Boolean(row.is_active),
  }));
}

export function resolveCommissionPercentForDate(dateStr, periods, defaultPercent) {
  const match = periods.find(
    (period) => dateStr >= period.startDate && dateStr <= period.endDate,
  );
  return match ? Number(match.commissionPercent) : Number(defaultPercent);
}

export async function buildCommissionSegments(startDate, endDate) {
  const periods = await getActiveCommissionPeriodsForRange(startDate, endDate);
  const defaultPercent = await getDefaultCommissionPercent();
  const segments = [];
  let current = startDate;

  while (current <= endDate) {
    const commissionPercent = resolveCommissionPercentForDate(current, periods, defaultPercent);
    const last = segments[segments.length - 1];

    if (last && last.commissionPercent === commissionPercent) {
      last.endDate = current;
    } else {
      segments.push({ startDate: current, endDate: current, commissionPercent });
    }

    current = addDays(current, 1);
  }

  return segments;
}

async function getReferralEligibleDepositForRange(userIds, dateFrom, dateTo) {
  if (!userIds.length) {
    return 0;
  }

  const pool = getPool();
  const placeholders = userIds.map(() => '?').join(',');
  const txParams = [...userIds, dateFrom, dateTo];
  const agentParams = [...userIds, dateFrom, dateTo];

  const [[metrics]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE
         WHEN type = 'deposit' AND status = 'approved' THEN amount
         WHEN type = 'adjustment' AND status = 'approved' AND amount > 0 THEN amount
         ELSE 0
       END), 0) AS totalDeposit
     FROM transactions
     WHERE user_id IN (${placeholders})
       AND created_at >= ?
       AND created_at <= ?`,
    txParams,
  );

  const [[agentMetrics]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE
         WHEN type IN ('deposit', 'topup_player') AND status IN ('approved', 'completed') THEN amount
         ELSE 0
       END), 0) AS agentTopupDeposit
     FROM agent_transactions
     WHERE user_id IN (${placeholders})
       AND created_at >= ?
       AND created_at <= ?`,
    agentParams,
  );

  return Number(metrics.totalDeposit) + Number(agentMetrics.agentTopupDeposit || 0);
}

export function resolveSettlementZeroReason({
  totalReferrals,
  totalEligibleDeposit,
  commissionPercent,
  amount,
  creditUserId,
}) {
  if (!creditUserId) return 'No linked user wallet';
  if (!totalReferrals) return 'No eligible referral deposit';
  if (!commissionPercent || commissionPercent <= 0) return 'Commission rule missing';
  if (!totalEligibleDeposit || totalEligibleDeposit <= 0) return 'No eligible referral deposit';
  if (!amount || amount <= 0) return 'No eligible referral deposit';
  return null;
}

export async function calculateDateWiseCommission(affiliateId, startDate, endDate) {
  const pool = getPool();
  const segments = await buildCommissionSegments(startDate, endDate);
  const defaultPercent = await getDefaultCommissionPercent();

  const [referrals] = await pool.query(
    `SELECT u.id AS user_id
     FROM affiliate_profiles child
     INNER JOIN users u ON u.id = child.user_id
     WHERE child.referred_by = ?`,
    [affiliateId],
  );

  const [[affiliateRow]] = await pool.query(
    `SELECT user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );

  const userIds = referrals.map((row) => row.user_id);
  let totalEligibleDeposit = 0;
  let totalCommission = 0;
  const breakdown = [];

  for (const segment of segments) {
    const segmentEligible = await getReferralEligibleDepositForRange(
      userIds,
      `${segment.startDate} 00:00:00`,
      `${segment.endDate} 23:59:59`,
    );

    const segmentCommission = (segmentEligible * segment.commissionPercent) / 100;
    totalEligibleDeposit += segmentEligible;
    totalCommission += segmentCommission;

    breakdown.push({
      startDate: segment.startDate,
      endDate: segment.endDate,
      commissionPercent: segment.commissionPercent,
      eligibleDeposit: Number(segmentEligible.toFixed(2)),
      commission: Number(segmentCommission.toFixed(2)),
    });
  }

  const amount = Number(totalCommission.toFixed(2));
  const eligible = Number(totalEligibleDeposit.toFixed(2));
  let commissionPercent = defaultPercent;

  if (eligible > 0) {
    commissionPercent = Number(((amount / eligible) * 100).toFixed(2));
  } else if (segments.length === 1) {
    commissionPercent = Number(segments[0].commissionPercent);
  }

  const creditUserId = affiliateRow?.user_id ? Number(affiliateRow.user_id) : null;
  const zeroReason = resolveSettlementZeroReason({
    totalReferrals: referrals.length,
    totalEligibleDeposit: eligible,
    commissionPercent,
    amount,
    creditUserId,
  });

  return {
    totalProfit: eligible,
    totalEligibleDeposit: eligible,
    totalReferrals: referrals.length,
    commissionPercent,
    amount,
    creditUserId,
    zeroReason,
    breakdown,
  };
}

export { getSettlementWindowForDay, getPeriodDayNames, SETTLEMENT_DAY_OPTIONS, WEEKDAYS } from './affiliateSettlementBarService.js';

export async function migrateCommissionPeriodSchema() {
  const pool = getPool();
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  for (const file of ['affiliate_commission_periods.sql', 'affiliate_settlement_cron_log.sql']) {
    const schemaPath = path.join(__dirname, '..', 'sql', file);
    if (!fs.existsSync(schemaPath)) continue;
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
  }
}
