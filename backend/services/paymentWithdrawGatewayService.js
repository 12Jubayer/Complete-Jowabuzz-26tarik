import { getPool } from '../config/db.js';
import { createWithdrawPayout } from './paymentGatewayService.js';

export async function resolveWithdrawAccountName(db, userId) {
  const [[bank]] = await db.query(
    `SELECT account_name FROM user_bank_details WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (bank?.account_name) return String(bank.account_name).trim();

  const [[user]] = await db.query(`SELECT name FROM users WHERE id = ? LIMIT 1`, [userId]);
  return String(user?.name || '').trim();
}

export async function forwardWithdrawToPaymentGateway({
  userId,
  transactionId,
  amount,
  method,
  accountNumber,
}) {
  const pool = getPool();
  const accountName = await resolveWithdrawAccountName(pool, userId);
  return createWithdrawPayout({
    userId,
    amount,
    method,
    accountNumber,
    accountName,
    transactionId,
  });
}

export default { resolveWithdrawAccountName, forwardWithdrawToPaymentGateway };
