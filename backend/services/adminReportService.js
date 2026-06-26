import { getPool } from '../config/db.js';
import { mapReleaseStatus } from './adminAffiliateReleaseService.js';

const REPORT_TYPES = new Set(['deposit', 'withdraw', 'bonus', 'affiliate']);

export function parseReportPagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function normalizeReportType(type) {
  const value = String(type || 'deposit').trim().toLowerCase();
  if (!REPORT_TYPES.has(value)) {
    const error = new Error('Invalid report type');
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function formatShortId(id) {
  return Number(id).toString(16).padStart(8, '0').slice(-8);
}

function buildDateFilters(query, column, filters, params) {
  const startDate = String(query.startDate || '').trim();
  if (startDate) {
    filters.push(`DATE(${column}) >= ?`);
    params.push(startDate);
  }

  const endDate = String(query.endDate || '').trim();
  if (endDate) {
    filters.push(`DATE(${column}) <= ?`);
    params.push(endDate);
  }
}

function buildUserPrefixFilter(query, filters, params) {
  const userPrefix = String(query.userPrefix || '').trim();
  if (!userPrefix) return;

  filters.push(`(u.user_uid LIKE ? OR CAST(u.id AS CHAR) LIKE ?)`);
  params.push(`${userPrefix}%`, `${userPrefix}%`);
}

function buildTransactionReport(type, query, pagination) {
  const filters = ['t.type = ?'];
  const params = [type];

  buildDateFilters(query, 't.created_at', filters, params);
  buildUserPrefixFilter(query, filters, params);

  const whereClause = `WHERE ${filters.join(' AND ')}`;
  const fromClause = `FROM transactions t INNER JOIN users u ON u.id = t.user_id`;

  return {
    whereClause,
    params,
    fromClause,
    amountColumn: 't.amount',
    selectSql: `SELECT
      t.id,
      t.amount,
      t.status,
      t.created_at AS createdAt,
      u.user_uid AS userUid,
      u.id AS userId`,
    orderBy: 't.created_at DESC',
    mapRow: (row) => ({
      id: formatShortId(row.id),
      user: row.userUid || formatShortId(row.userId),
      amount: Number(row.amount),
      status: row.status,
      date: row.createdAt,
    }),
    mapStatus: (status) => status,
  };
}

function buildAffiliateReport(query, pagination) {
  const filters = [];
  const params = [];

  buildDateFilters(query, 'sh.created_at', filters, params);
  buildUserPrefixFilter(query, filters, params);

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const fromClause = `FROM settlement_history sh
    INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
    INNER JOIN users u ON u.id = ap.user_id`;

  return {
    whereClause,
    params,
    fromClause,
    amountColumn: 'sh.amount',
    selectSql: `SELECT
      sh.id,
      sh.amount,
      sh.status,
      sh.created_at AS createdAt,
      u.user_uid AS userUid,
      ap.user_id AS userId`,
    orderBy: 'sh.created_at DESC',
    mapRow: (row) => ({
      id: formatShortId(row.id),
      user: row.userUid || formatShortId(row.userId),
      amount: Number(row.amount),
      status: mapReleaseStatus(row.status),
      date: row.createdAt,
    }),
  };
}

export async function getAdminReport(query) {
  const type = normalizeReportType(query.type);
  const { page, limit, offset } = parseReportPagination(query);
  const pool = getPool();

  const config =
    type === 'affiliate'
      ? buildAffiliateReport(query, { page, limit, offset })
      : buildTransactionReport(type, query, { page, limit, offset });

  const [[aggregate]] = await pool.query(
    `SELECT
       COUNT(*) AS totalRecords,
       COALESCE(SUM(${config.amountColumn}), 0) AS totalAmount
     ${config.fromClause}
     ${config.whereClause}`,
    config.params,
  );

  const [rows] = await pool.query(
    `${config.selectSql}
     ${config.fromClause}
     ${config.whereClause}
     ORDER BY ${config.orderBy}
     LIMIT ? OFFSET ?`,
    [...config.params, limit, offset],
  );

  return {
    totalAmount: Number(aggregate.totalAmount),
    totalRecords: Number(aggregate.totalRecords),
    page,
    limit,
    data: rows.map(config.mapRow),
  };
}

export default {
  getAdminReport,
  parseReportPagination,
  normalizeReportType,
};
