import { getPool } from '../config/db.js';

export const AGENT_TX_COMPLETED_STATUSES = ['completed', 'approved'];

export function windowToSqlRange(window) {
  return {
    periodStartSql: `${window.startDate} 00:00:00`,
    periodEndSql: `${window.endDate} 23:59:59`,
  };
}

export async function calculateAgentTransactionTotals(
  agentId,
  periodStartSql,
  periodEndSql,
  depositPercent,
  withdrawPercent,
) {
  const pool = getPool();
  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE
         WHEN type = 'topup_player' AND user_id IS NOT NULL
           AND status IN ('completed', 'approved') THEN amount
         ELSE 0
       END), 0) AS total_deposit,
       COALESCE(SUM(CASE
         WHEN type = 'withdraw' AND user_id IS NOT NULL
           AND status IN ('completed', 'approved') THEN amount
         ELSE 0
       END), 0) AS total_withdraw,
       COUNT(CASE
         WHEN user_id IS NOT NULL
           AND status IN ('completed', 'approved')
           AND type IN ('topup_player', 'withdraw') THEN 1
       END) AS matched_transaction_count
     FROM agent_transactions
     WHERE agent_id = ?
       AND created_at >= ?
       AND created_at <= ?`,
    [agentId, periodStartSql, periodEndSql],
  );

  const totalDepositAmount = Number(totals.total_deposit || 0);
  const totalWithdrawAmount = Number(totals.total_withdraw || 0);
  const matchedTransactionCount = Number(totals.matched_transaction_count || 0);
  const depositCommission = Number(((totalDepositAmount * depositPercent) / 100).toFixed(2));
  const withdrawCommission = Number(((totalWithdrawAmount * withdrawPercent) / 100).toFixed(2));
  const totalCommission = Number((depositCommission + withdrawCommission).toFixed(2));

  return {
    totalDepositAmount,
    totalWithdrawAmount,
    depositCommission,
    withdrawCommission,
    totalCommission,
    matchedTransactionCount,
  };
}

export function resolveSettlementZeroReason({
  agentExists,
  totalDepositAmount,
  totalWithdrawAmount,
  totalCommission,
  matchedTransactionCount,
}) {
  if (!agentExists) return 'Missing agent wallet';
  if (matchedTransactionCount > 0 || totalDepositAmount > 0 || totalWithdrawAmount > 0) {
    if (totalCommission <= 0) return 'No commission generated';
    return null;
  }
  return 'No player transactions in period';
}
