import { ensureUserWallet } from './userWalletService.js';

export const LOW_BALANCE_TURNOVER_RESET_THRESHOLD = 0.5;

export function shouldResetTurnoverOnBalance(balance) {
  return Number(balance) < LOW_BALANCE_TURNOVER_RESET_THRESHOLD;
}

export async function cancelTurnoverOnLowBalance(userId, balance, connection) {
  if (!shouldResetTurnoverOnBalance(balance)) {
    return { cancelled: false };
  }

  await ensureUserWallet(userId, connection);

  const [[wallet]] = await connection.query(
    `SELECT required_turnover, completed_turnover
     FROM user_wallets
     WHERE user_id = ?
     FOR UPDATE`,
    [userId],
  );

  const hasMainTurnover =
    Number(wallet?.required_turnover || 0) > 0 || Number(wallet?.completed_turnover || 0) > 0;

  const [[bonusAccounts]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM user_bonus_accounts
     WHERE user_id = ? AND status = 'in_progress'`,
    [userId],
  );

  const [[bonusProgress]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM bonus_user_progress
     WHERE user_id = ? AND status = 'in_progress'`,
    [userId],
  );

  const [[bonusClaims]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM user_bonus_claims
     WHERE user_id = ? AND status = 'active'`,
    [userId],
  );

  const hasBonusTurnover =
    Number(bonusAccounts?.total || 0) > 0 ||
    Number(bonusProgress?.total || 0) > 0 ||
    Number(bonusClaims?.total || 0) > 0;

  if (!hasMainTurnover && !hasBonusTurnover) {
    return { cancelled: false };
  }

  if (hasMainTurnover) {
    await connection.query(
      `UPDATE user_wallets
       SET required_turnover = 0, completed_turnover = 0
       WHERE user_id = ?`,
      [userId],
    );

    await connection.query(
      `INSERT INTO turnover_records (user_id, source_type, source_amount, turnover_amount)
       VALUES (?, 'low_balance_reset', ?, 0)`,
      [userId, balance],
    );
  }

  if (Number(bonusAccounts?.total || 0) > 0) {
    await connection.query(
      `UPDATE user_bonus_accounts
       SET status = 'cancelled', deposit_transaction_id = NULL, updated_at = NOW()
       WHERE user_id = ? AND status = 'in_progress'`,
      [userId],
    );
  }

  if (Number(bonusProgress?.total || 0) > 0) {
    await connection.query(
      `UPDATE bonus_user_progress
       SET status = 'cancelled',
           remaining_turnover = 0,
           progress_percent = 0,
           updated_at = NOW()
       WHERE user_id = ? AND status = 'in_progress'`,
      [userId],
    );
  }

  if (Number(bonusClaims?.total || 0) > 0) {
    await connection.query(
      `UPDATE user_bonus_claims
       SET status = 'cancelled'
       WHERE user_id = ? AND status = 'active'`,
      [userId],
    );
  }

  return { cancelled: true };
}

export default {
  LOW_BALANCE_TURNOVER_RESET_THRESHOLD,
  shouldResetTurnoverOnBalance,
  cancelTurnoverOnLowBalance,
};
