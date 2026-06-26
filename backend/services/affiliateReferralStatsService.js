import { getPool } from '../config/db.js';

const REGISTERED_AFFILIATE_FILTER = `
  ap.registered_as_affiliate = 1
  AND ap.status = 'approved'
`;

export async function getAdminReferralStatistics() {
  const pool = getPool();

  const [[totals]] = await pool.query(
    `SELECT
       COUNT(*) AS totalAffiliates,
       COALESCE(SUM(ap.total_referrals), 0) AS totalReferrals,
       COALESCE(SUM(ap.total_deposit), 0) AS totalDeposit,
       COALESCE(SUM(ap.total_commission), 0) AS totalCommission
     FROM affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     WHERE ${REGISTERED_AFFILIATE_FILTER}`,
  );

  const [topAffiliates] = await pool.query(
    `SELECT
       ap.id,
       u.name,
       ap.referral_code,
       ap.total_referrals,
       ap.total_commission
     FROM affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     WHERE ${REGISTERED_AFFILIATE_FILTER}
     ORDER BY ap.total_referrals DESC, ap.total_commission DESC, ap.id ASC
     LIMIT 50`,
  );

  return {
    totals: {
      totalAffiliates: Number(totals.totalAffiliates || 0),
      totalReferrals: Number(totals.totalReferrals || 0),
      totalDeposit: Number(totals.totalDeposit || 0),
      totalCommission: Number(totals.totalCommission || 0),
    },
    topAffiliates: topAffiliates.map((row) => ({
      id: row.id,
      name: row.name,
      referralCode: row.referral_code,
      totalReferrals: Number(row.total_referrals || 0),
      totalCommission: Number(row.total_commission || 0),
    })),
  };
}

async function safeDeleteOrphans(connection, sql) {
  try {
    const [result] = await connection.query(sql);
    return Number(result.affectedRows || 0);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return 0;
    }
    throw error;
  }
}

export async function cleanupOrphanAffiliateReferralStatistics() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const cleanupQueries = [
      `DELETE sh
       FROM settlement_history sh
       LEFT JOIN affiliate_profiles ap ON ap.id = sh.affiliate_id
       WHERE ap.id IS NULL`,
      `DELETE s
       FROM affiliate_settlements s
       LEFT JOIN affiliate_profiles ap ON ap.id = s.affiliate_id
       WHERE ap.id IS NULL`,
      `DELETE wr
       FROM affiliate_withdraw_requests wr
       LEFT JOIN affiliate_profiles ap ON ap.id = wr.affiliate_id
       WHERE ap.id IS NULL`,
      `DELETE t
       FROM affiliate_transactions t
       LEFT JOIN affiliate_profiles ap ON ap.id = t.affiliate_id
       WHERE ap.id IS NULL`,
    ];

    const removed = {};
    for (const sql of cleanupQueries) {
      const table = sql.match(/FROM (\w+)/)?.[1] || 'unknown';
      removed[table] = await safeDeleteOrphans(connection, sql);
    }

    await connection.commit();

    const [[counts]] = await pool.query(
      `SELECT
         SUM(CASE WHEN ap.registered_as_affiliate = 1 AND ap.status = 'approved' THEN 1 ELSE 0 END) AS registeredAffiliates,
         SUM(CASE WHEN ap.registered_as_affiliate = 0 THEN 1 ELSE 0 END) AS playerReferralProfiles
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id`,
    );

    return {
      removed,
      registeredAffiliates: Number(counts.registeredAffiliates || 0),
      playerReferralProfiles: Number(counts.playerReferralProfiles || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  getAdminReferralStatistics,
  cleanupOrphanAffiliateReferralStatistics,
};
