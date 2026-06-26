import { getPool } from '../config/db.js';

export const WITHDRAW_BLOCKED_MSG =
  'Your withdrawal has been blocked. Please contact support.';

export async function isPlayerWithdrawBlocked(userId, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT withdraw_blocked FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return Number(row?.withdraw_blocked || 0) === 1;
}

export async function assertPlayerCanWithdraw(userId, res, connection = null) {
  if (await isPlayerWithdrawBlocked(userId, connection)) {
    res.status(403).json({ error: WITHDRAW_BLOCKED_MSG });
    return false;
  }
  return true;
}

export default {
  WITHDRAW_BLOCKED_MSG,
  isPlayerWithdrawBlocked,
  assertPlayerCanWithdraw,
};
