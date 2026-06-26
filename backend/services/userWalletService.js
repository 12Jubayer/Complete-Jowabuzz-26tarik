import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function migrateUserProfileSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'user_profile_tables.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await pool.query(
    `INSERT INTO user_wallets (user_id, balance, required_turnover, completed_turnover, vip_level, vip_exp)
     SELECT u.id, u.balance, 0, 0, 0, 0
     FROM users u
     LEFT JOIN user_wallets uw ON uw.user_id = u.id
     WHERE uw.user_id IS NULL AND u.role = 'user'`,
  );

  await pool.query(
    `UPDATE user_wallets uw
     INNER JOIN users u ON u.id = uw.user_id
     SET uw.balance = u.balance
     WHERE uw.balance <> u.balance`,
  );
}

export async function ensureUserWallet(userId, connection = null) {
  const pool = connection || getPool();
  await pool.query(
    `INSERT IGNORE INTO user_wallets (user_id, balance, required_turnover, completed_turnover)
     SELECT id, balance, 0, 0 FROM users WHERE id = ?`,
    [userId],
  );
}

export async function syncWalletBalance(userId, connection = null) {
  const pool = connection || getPool();
  const [[user]] = await pool.query(`SELECT balance FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!user) return;
  await ensureUserWallet(userId, pool);
  await pool.query(`UPDATE user_wallets SET balance = ? WHERE user_id = ?`, [
    user.balance,
    userId,
  ]);

  await pool.query(
    `INSERT IGNORE INTO wallets (user_id, balance, currency)
     SELECT id, balance, 'BDT' FROM users WHERE id = ?`,
    [userId],
  );
  await pool.query(`UPDATE wallets SET balance = ? WHERE user_id = ?`, [user.balance, userId]);
}

export async function addRequiredTurnover(userId, amount, sourceType = 'deposit', connection = null) {
  const pool = connection || getPool();
  await ensureUserWallet(userId, pool);
  const turnoverAmount = Number(amount);
  await pool.query(
    `UPDATE user_wallets SET required_turnover = required_turnover + ? WHERE user_id = ?`,
    [turnoverAmount, userId],
  );
  await pool.query(
    `INSERT INTO turnover_records (user_id, source_type, source_amount, turnover_amount)
     VALUES (?, ?, ?, ?)`,
    [userId, sourceType, amount, turnoverAmount],
  );
}

export function resolveEffectiveTurnover(wallet, primaryProgress = null) {
  if (
    primaryProgress &&
    String(primaryProgress.status || 'in_progress') === 'in_progress'
  ) {
    const required = Number(primaryProgress.requiredTurnover ?? 0);
    const completed = Number(primaryProgress.completedTurnover ?? 0);
    return {
      requiredTurnover: required,
      completedTurnover: completed,
      remainingTurnover: Math.max(0, required - completed),
      turnoverComplete: required <= 0 || completed >= required,
    };
  }

  const required = Number(wallet?.required_turnover ?? 0);
  const completed = Number(wallet?.completed_turnover ?? 0);
  return {
    requiredTurnover: required,
    completedTurnover: completed,
    remainingTurnover: Math.max(0, required - completed),
    turnoverComplete: required <= 0 || completed >= required,
  };
}

export function isTurnoverComplete(wallet) {
  return Number(wallet.completed_turnover) >= Number(wallet.required_turnover);
}

export default migrateUserProfileSchema;
