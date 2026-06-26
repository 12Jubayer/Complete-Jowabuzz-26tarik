import { getPool } from '../config/db.js';

function getAffiliateId(req) {
  return Number(req.affiliate?.sub);
}

export async function requestAffiliateWithdraw(req, res) {
  return res.status(403).json({
    error: 'Affiliate self-withdraw is disabled. Weekly commission is approved by admin and shown in Settlement History.',
  });
}

export async function getAffiliateWithdrawHistory(req, res) {
  const pool = getPool();
  const affiliateId = getAffiliateId(req);

  try {
    const [rows] = await pool.query(
      `SELECT id, week_start, week_end, total_profit, amount, status, created_at
       FROM settlement_history
       WHERE affiliate_id = ?
       ORDER BY week_start DESC`,
      [affiliateId],
    );

    return res.json({
      requests: rows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        weekStart: row.week_start,
        weekEnd: row.week_end,
        profit: Number(row.total_profit),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Affiliate settlement history error:', error);
    return res.status(500).json({ error: 'Failed to load settlement history' });
  }
}

export default requestAffiliateWithdraw;
