import { refreshAffiliateStats } from './affiliateService.js';
import { notifyAffiliatePayout } from './notificationService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function normalizeStatusFilter(status) {
  const value = String(status || '').trim().toLowerCase();
  if (!value || value === 'all') return null;
  if (value === 'released') return ['released', 'completed'];
  return [value];
}

function buildReleaseFilters(query) {
  const filters = [];
  const params = [];

  const statuses = normalizeStatusFilter(query.status);
  if (statuses) {
    filters.push(`sh.status IN (${statuses.map(() => '?').join(', ')})`);
    params.push(...statuses);
  }

  const startDate = String(query.startDate || '').trim();
  if (startDate) {
    filters.push('DATE(sh.created_at) >= ?');
    params.push(startDate);
  }

  const endDate = String(query.endDate || '').trim();
  if (endDate) {
    filters.push('DATE(sh.created_at) <= ?');
    params.push(endDate);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR ap.referral_code LIKE ? OR CAST(ap.user_id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR ap.user_id = ? OR ap.id = ?' : ''
      })`,
    );
    params.push(like, like, like, like, like);
    if (numericId > 0) {
      params.push(numericId, numericId);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params };
}

export { parsePagination, buildReleaseFilters };

export function mapReleaseStatus(status) {
  if (status === 'completed') return 'released';
  return status;
}

export async function approveAffiliateRelease(connection, settlementId) {
  const [[settlement]] = await connection.query(
    `SELECT sh.*, ap.user_id AS affiliate_user_id
     FROM settlement_history sh
     INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
     WHERE sh.id = ?
     FOR UPDATE`,
    [settlementId],
  );

  if (!settlement) {
    const error = new Error('Affiliate release record not found');
    error.statusCode = 404;
    throw error;
  }

  if (settlement.status === 'approved') {
    const error = new Error('Release record is already approved');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'released' || settlement.status === 'completed') {
    const error = new Error('Release record is already released');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'rejected') {
    const error = new Error('Rejected release record cannot be approved');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status !== 'pending') {
    const error = new Error('Only pending release records can be approved');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(
    `UPDATE settlement_history SET status = 'approved' WHERE id = ?`,
    [settlementId],
  );

  return settlement;
}

export async function rejectAffiliateRelease(connection, settlementId) {
  const [[settlement]] = await connection.query(
    `SELECT * FROM settlement_history WHERE id = ? FOR UPDATE`,
    [settlementId],
  );

  if (!settlement) {
    const error = new Error('Affiliate release record not found');
    error.statusCode = 404;
    throw error;
  }

  if (settlement.status === 'released' || settlement.status === 'completed') {
    const error = new Error('Released record cannot be rejected');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'rejected') {
    const error = new Error('Release record is already rejected');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'approved') {
    const error = new Error('Approved release record cannot be rejected');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status !== 'pending') {
    const error = new Error('Only pending release records can be rejected');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(
    `UPDATE settlement_history SET status = 'rejected' WHERE id = ?`,
    [settlementId],
  );

  await connection.query(
    `UPDATE affiliate_profiles
     SET pending_commission = GREATEST(pending_commission - ?, 0),
         total_commission = GREATEST(total_commission - ?, 0)
     WHERE id = ?`,
    [settlement.amount, settlement.amount, settlement.affiliate_id],
  );

  return settlement;
}

export async function releaseAffiliateSettlement(connection, settlementId) {
  const [[settlement]] = await connection.query(
    `SELECT sh.*, ap.user_id AS affiliate_user_id
     FROM settlement_history sh
     INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
     WHERE sh.id = ?
     FOR UPDATE`,
    [settlementId],
  );

  if (!settlement) {
    const error = new Error('Affiliate release record not found');
    error.statusCode = 404;
    throw error;
  }

  if (settlement.status === 'released' || settlement.status === 'completed') {
    const error = new Error('Release record is already released');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'rejected') {
    const error = new Error('Rejected release record cannot be released');
    error.statusCode = 409;
    throw error;
  }

  if (settlement.status === 'pending') {
    const error = new Error('Approve the release record before releasing');
    error.statusCode = 400;
    throw error;
  }

  if (settlement.status !== 'approved') {
    const error = new Error('Only approved release records can be released');
    error.statusCode = 400;
    throw error;
  }

  const amount = Number(settlement.amount);

  const [[affiliate]] = await connection.query(
    `SELECT pending_commission, settled_commission FROM affiliate_profiles WHERE id = ? FOR UPDATE`,
    [settlement.affiliate_id],
  );

  if (!affiliate || Number(affiliate.pending_commission) < amount) {
    const error = new Error('Insufficient pending commission');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(
    `UPDATE settlement_history SET status = 'released' WHERE id = ?`,
    [settlementId],
  );

  await connection.query(
    `UPDATE affiliate_profiles
     SET pending_commission = GREATEST(pending_commission - ?, 0),
         settled_commission = settled_commission + ?
     WHERE id = ?`,
    [amount, amount, settlement.affiliate_id],
  );

  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'adjustment', ?, 'approved', ?, NOW())`,
    [settlement.affiliate_user_id, amount, `affiliate_release:${settlementId}`],
  );

  return settlement;
}

export async function finalizeAffiliateReleaseSideEffects(settlement) {
  if (settlement?.affiliate_id) {
    await refreshAffiliateStats(settlement.affiliate_id);
  }
  if (settlement?.affiliate_user_id) {
    await notifyAffiliatePayout(settlement.affiliate_user_id, settlement.amount);
  }
}

export default {
  approveAffiliateRelease,
  rejectAffiliateRelease,
  releaseAffiliateSettlement,
  finalizeAffiliateReleaseSideEffects,
};
