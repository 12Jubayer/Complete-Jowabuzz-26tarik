import { connectDatabase, getPool } from '../backend/config/db.js';
import { applyBalanceDelta } from '../backend/services/gameWalletService.js';
import { syncWalletBalance } from '../backend/services/userWalletService.js';

const USER_ID = 67;
const ACCOUNT_ID = 33;
const DEPOSIT_TX_ID = 207;
const DEPOSIT_AMOUNT = 100;
const WRONG_BONUS = 100;
const CORRECT_BONUS = 3;
const RULE_ID = 1;

await connectDatabase();
const pool = getPool();
const connection = await pool.getConnection();

try {
  await connection.beginTransaction();

  const [[account]] = await connection.query(
    `SELECT * FROM user_bonus_accounts WHERE id = ? AND user_id = ? FOR UPDATE`,
    [ACCOUNT_ID, USER_ID],
  );
  if (!account || account.status !== 'in_progress') {
    throw new Error('Expected in-progress bonus account 33 for user 67');
  }

  await applyBalanceDelta(connection, USER_ID, -WRONG_BONUS);
  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [USER_ID, -WRONG_BONUS, `deposit_bonus_reversal:${ACCOUNT_ID}:manual_fix`],
  );

  await connection.query(
    `UPDATE user_bonus_accounts
     SET status = 'cancelled', deposit_transaction_id = NULL, updated_at = NOW()
     WHERE id = ?`,
    [ACCOUNT_ID],
  );

  await applyBalanceDelta(connection, USER_ID, CORRECT_BONUS);
  const [bonusTx] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [USER_ID, CORRECT_BONUS, `deposit_bonus:${RULE_ID}:${DEPOSIT_TX_ID}:manual_fix`],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [USER_ID, 'Automatic Deposit Bonus', CORRECT_BONUS, bonusTx.insertId],
  );

  const requiredTurnover = Number(((DEPOSIT_AMOUNT + CORRECT_BONUS) * 1).toFixed(2));

  await connection.query(
    `INSERT INTO user_bonus_accounts
       (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
        turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
     VALUES (?, ?, ?, ?, 3, ?, 1, ?, 0, ?, 0, 'in_progress')`,
    [USER_ID, RULE_ID, DEPOSIT_TX_ID, DEPOSIT_AMOUNT, CORRECT_BONUS, requiredTurnover, requiredTurnover],
  );

  await connection.query(
    `UPDATE user_wallets
     SET required_turnover = GREATEST(0, required_turnover - ? + ?)
     WHERE user_id = ?`,
    [WRONG_BONUS, CORRECT_BONUS, USER_ID],
  );

  await connection.query(
    `UPDATE deposit_requests SET bonus_rule_id = NULL WHERE transaction_id = ?`,
    [DEPOSIT_TX_ID],
  );

  await connection.commit();
  await syncWalletBalance(USER_ID);

  const [[user]] = await pool.query('SELECT balance FROM users WHERE id = ?', [USER_ID]);
  const [[wallet]] = await pool.query(
    'SELECT balance, required_turnover, completed_turnover FROM user_wallets WHERE user_id = ?',
    [USER_ID],
  );
  const [accounts] = await pool.query(
    `SELECT id, rule_id, bonus_amount, required_turnover, status
     FROM user_bonus_accounts WHERE user_id = ? ORDER BY id DESC LIMIT 3`,
    [USER_ID],
  );

  console.log('Fixed user balance:', user.balance);
  console.log('Wallet:', wallet);
  console.log('Recent bonus accounts:', accounts);
} catch (error) {
  await connection.rollback();
  console.error('Fix failed:', error.message);
  process.exitCode = 1;
} finally {
  connection.release();
  process.exit(process.exitCode || 0);
}
