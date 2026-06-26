import { getPool } from '../config/db.js';
import {
  approveAffiliateRelease,
  buildReleaseFilters,
  finalizeAffiliateReleaseSideEffects,
  mapReleaseStatus,
  parsePagination,
  rejectAffiliateRelease,
  releaseAffiliateSettlement,
} from '../services/adminAffiliateReleaseService.js';

export async function listAffiliateReleaseRecords(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildReleaseFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM settlement_history sh
       INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
       INNER JOIN users u ON u.id = ap.user_id
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT
         sh.id,
         sh.affiliate_id,
         ap.user_id AS affiliateUserId,
         u.name AS affiliateName,
         u.phone AS affiliatePhone,
         u.email AS affiliateEmail,
         ap.referral_code AS referralCode,
         sh.total_profit AS totalLoss,
         sh.commission_percent AS commissionPercent,
         sh.amount,
         sh.status,
         sh.week_start AS weekStart,
         sh.week_end AS weekEnd,
         sh.created_at AS createdAt,
         (
           SELECT COUNT(*)
           FROM referral_records rr
           WHERE rr.referrer_user_id = ap.user_id
         ) AS referrals
       FROM settlement_history sh
       INNER JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
       INNER JOIN users u ON u.id = ap.user_id
       ${whereClause}
       ORDER BY sh.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map((row) => ({
        id: row.id,
        affiliateId: row.affiliate_id,
        affiliateName: row.affiliateName,
        affiliatePhone: row.affiliatePhone,
        affiliateUserId: row.affiliateUserId,
        referralCode: row.referralCode,
        referrals: Number(row.referrals),
        totalLoss: Number(row.totalLoss),
        commissionPercent: Number(row.commissionPercent),
        amount: Number(row.amount),
        status: mapReleaseStatus(row.status),
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        createdAt: row.createdAt,
      })),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List affiliate release records error:', error);
    return res.status(500).json({ error: 'Failed to fetch affiliate release records' });
  }
}

export async function approveAffiliateReleaseRecord(req, res) {
  const pool = getPool();
  const settlementId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!settlementId) {
    return res.status(400).json({ error: 'Invalid release id' });
  }

  try {
    await connection.beginTransaction();
    const settlement = await approveAffiliateRelease(connection, settlementId);
    await connection.commit();

    return res.json({
      success: true,
      message: 'Affiliate release approved',
      record: { id: settlement.id, status: 'approved' },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve affiliate release error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve affiliate release',
    });
  } finally {
    connection.release();
  }
}

export async function rejectAffiliateReleaseRecord(req, res) {
  const pool = getPool();
  const settlementId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!settlementId) {
    return res.status(400).json({ error: 'Invalid release id' });
  }

  try {
    await connection.beginTransaction();
    const settlement = await rejectAffiliateRelease(connection, settlementId);
    await connection.commit();
    await finalizeAffiliateReleaseSideEffects(settlement);

    return res.json({
      success: true,
      message: 'Affiliate release rejected',
      record: { id: settlement.id, status: 'rejected' },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject affiliate release error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject affiliate release',
    });
  } finally {
    connection.release();
  }
}

export async function releaseAffiliateReleaseRecord(req, res) {
  const pool = getPool();
  const settlementId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!settlementId) {
    return res.status(400).json({ error: 'Invalid release id' });
  }

  try {
    await connection.beginTransaction();
    const settlement = await releaseAffiliateSettlement(connection, settlementId);
    await connection.commit();
    await finalizeAffiliateReleaseSideEffects(settlement);

    return res.json({
      success: true,
      message: 'Affiliate commission released',
      record: { id: settlement.id, status: 'released' },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Release affiliate settlement error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to release affiliate commission',
    });
  } finally {
    connection.release();
  }
}

export default listAffiliateReleaseRecords;
