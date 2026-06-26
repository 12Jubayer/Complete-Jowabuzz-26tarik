import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta } from './gameWalletService.js';
import {
  cancelDepositBonusAccount,
  listDepositBonusUserAccounts,
} from './depositBonusService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function computeProgress(completed, required) {
  const req = Number(required);
  const comp = Number(completed);
  if (req <= 0) return 100;
  return Number(Math.min(100, (comp / req) * 100).toFixed(2));
}

function computeRemaining(required, completed) {
  return Number(Math.max(0, Number(required) - Number(completed)).toFixed(2));
}

function formatProgressRow(row) {
  const required = Number(row.required_turnover);
  const completed = Number(row.completed_turnover);
  const progressPercent = Number(
    row.progress_percent ?? computeProgress(completed, required),
  );
  const remaining = Number(
    row.remaining_turnover ?? computeRemaining(required, completed),
  );

  return {
    id: row.id,
    userId: row.user_id,
    ruleId: row.rule_id,
    depositTransactionId: row.deposit_transaction_id,
    userName: row.user_name || '',
    userPhone: row.user_phone || '',
    depositAmount: Number(row.deposit_amount),
    bonusPercent: Number(row.bonus_percent),
    bonusAmount: Number(row.bonus_amount),
    turnoverMultiplier: Number(row.turnover_multiplier),
    requiredTurnover: required,
    completedTurnover: completed,
    remainingTurnover: remaining,
    progressPercent,
    claimCount: Number(row.claim_count || 1),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function progressStatusLabel(status) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'claimed') return 'Claimed';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

export function calculateBonusProgressFields({
  depositAmount,
  bonusPercent,
  turnoverMultiplier,
  completedTurnover = 0,
}) {
  const deposit = Number(depositAmount);
  const percent = Number(bonusPercent);
  const multiplier = Number(turnoverMultiplier);
  const bonusAmount = Number(((deposit * percent) / 100).toFixed(2));
  const requiredTurnover = Number(((deposit + bonusAmount) * multiplier).toFixed(2));
  const completed = Number(completedTurnover);
  const remainingTurnover = computeRemaining(requiredTurnover, completed);
  const progressPercent = computeProgress(completed, requiredTurnover);

  return {
    bonusAmount,
    requiredTurnover,
    completedTurnover: completed,
    remainingTurnover,
    progressPercent,
  };
}

async function fetchProgressById(id, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT p.*, u.name AS user_name, u.phone AS user_phone
     FROM bonus_user_progress p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );

  if (!row) {
    const error = new Error('Bonus progress record not found');
    error.statusCode = 404;
    throw error;
  }

  return formatProgressRow(row);
}

async function countUserRuleClaims(connection, userId, ruleId) {
  const [[row]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM bonus_user_progress
     WHERE user_id = ? AND rule_id = ? AND status IN ('in_progress', 'completed', 'claimed')`,
    [userId, ruleId],
  );
  return Number(row.total || 0);
}

async function reverseBonusCredit(connection, userId, bonusAmount, progressId, reason) {
  const amount = Number(bonusAmount);
  if (amount <= 0) return;

  await applyBalanceDelta(connection, userId, -amount);
  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, -amount, `bonus_progress_reversal:${progressId}:${reason}`],
  );
}

export async function migrateBonusUserProgressSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'bonus_user_progress.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await backfillBonusUserProgressFromClaims(pool);
}

async function backfillBonusUserProgressFromClaims(pool) {
  const [rows] = await pool.query(
    `SELECT c.*, r.bonus_percent, r.turnover_multiplier
     FROM user_bonus_claims c
     INNER JOIN bonus_turnover_rules r ON r.id = c.rule_id
     WHERE NOT EXISTS (
       SELECT 1 FROM bonus_user_progress p WHERE p.deposit_transaction_id = c.deposit_id
     )`,
  );

  for (const row of rows) {
    const calc = calculateBonusProgressFields({
      depositAmount: row.deposit_amount,
      bonusPercent: row.bonus_percent,
      turnoverMultiplier: row.turnover_multiplier,
      completedTurnover: row.completed_turnover,
    });

    let status = 'in_progress';
    if (row.status === 'completed') status = 'completed';
    else if (row.status === 'expired') status = 'expired';
    else if (row.status === 'cancelled') status = 'cancelled';
    else if (row.status === 'active') status = 'in_progress';

    const [[claimCountRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM user_bonus_claims WHERE user_id = ? AND rule_id = ? AND id <= ?`,
      [row.user_id, row.rule_id, row.id],
    );

    await pool.query(
      `INSERT INTO bonus_user_progress
         (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
          turnover_multiplier, required_turnover, completed_turnover, remaining_turnover,
          progress_percent, claim_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.user_id,
        row.rule_id,
        row.deposit_id,
        row.deposit_amount,
        row.bonus_percent,
        row.bonus_amount,
        row.turnover_multiplier,
        calc.requiredTurnover,
        row.completed_turnover,
        calc.remainingTurnover,
        calc.progressPercent,
        Number(claimCountRow.total || 1),
        status,
        row.claimed_at,
        row.claimed_at,
      ],
    );
  }
}

export async function createBonusUserProgress(connection, {
  userId,
  ruleId,
  depositTransactionId,
  depositAmount,
  bonusPercent,
  turnoverMultiplier,
}) {
  const [[existing]] = await connection.query(
    `SELECT id FROM bonus_user_progress WHERE deposit_transaction_id = ? LIMIT 1`,
    [depositTransactionId],
  );
  if (existing) return null;

  const claimCount = (await countUserRuleClaims(connection, userId, ruleId)) + 1;
  const calc = calculateBonusProgressFields({
    depositAmount,
    bonusPercent,
    turnoverMultiplier,
    completedTurnover: 0,
  });

  const [result] = await connection.query(
    `INSERT INTO bonus_user_progress
       (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
        turnover_multiplier, required_turnover, completed_turnover, remaining_turnover,
        progress_percent, claim_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'in_progress')`,
    [
      userId,
      ruleId,
      depositTransactionId,
      depositAmount,
      bonusPercent,
      calc.bonusAmount,
      turnoverMultiplier,
      calc.requiredTurnover,
      calc.remainingTurnover,
      calc.progressPercent,
      claimCount,
    ],
  );

  return {
    id: result.insertId,
    ...calc,
    bonusPercent: Number(bonusPercent),
    turnoverMultiplier: Number(turnoverMultiplier),
    claimCount,
  };
}

export async function applyBonusUserProgressTurnover(connection, userId, betAmount) {
  const amount = Number(betAmount);
  if (!amount || amount <= 0) return;

  let remaining = amount;
  const [rows] = await connection.query(
    `SELECT id, required_turnover, completed_turnover, bonus_amount, status
     FROM bonus_user_progress
     WHERE user_id = ? AND status = 'in_progress'
     ORDER BY created_at ASC
     FOR UPDATE`,
    [userId],
  );

  for (const row of rows) {
    if (remaining <= 0) break;

    const required = Number(row.required_turnover);
    const completed = Number(row.completed_turnover);
    const need = Math.max(0, required - completed);

    if (need <= 0) {
      await connection.query(
        `UPDATE bonus_user_progress
         SET status = 'completed', progress_percent = 100, remaining_turnover = 0, updated_at = NOW()
         WHERE id = ?`,
        [row.id],
      );
      continue;
    }

    const applied = Math.min(remaining, need);
    const newCompleted = completed + applied;
    const progressPercent = computeProgress(newCompleted, required);
    const remainingTurnover = computeRemaining(required, newCompleted);

    await connection.query(
      `UPDATE bonus_user_progress
       SET completed_turnover = ?, remaining_turnover = ?, progress_percent = ?, updated_at = NOW()
       WHERE id = ?`,
      [newCompleted, remainingTurnover, progressPercent, row.id],
    );

    if (newCompleted >= required) {
      await connection.query(
        `UPDATE bonus_user_progress
         SET status = 'completed', progress_percent = 100, remaining_turnover = 0
         WHERE id = ?`,
        [row.id],
      );
    }

    remaining -= applied;
  }
}

export async function expireStaleBonusUserProgress(db = null) {
  const pool = db || getPool();
  const connection = db ? null : await pool.getConnection();
  const executor = connection || pool;

  try {
    if (connection) await connection.beginTransaction();

    const [rows] = await executor.query(
      `SELECT p.id, p.user_id, p.bonus_amount, p.status, r.end_at
       FROM bonus_user_progress p
       INNER JOIN bonus_turnover_rules r ON r.id = p.rule_id
       WHERE p.status = 'in_progress' AND r.end_at < NOW()`,
    );

    for (const row of rows) {
      await reverseBonusCredit(executor, row.user_id, row.bonus_amount, row.id, 'expired');
      await executor.query(
        `UPDATE bonus_user_progress SET status = 'expired', updated_at = NOW() WHERE id = ?`,
        [row.id],
      );
    }

    if (connection) await connection.commit();
    return rows.length;
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function listAdminBonusProgress({
  status = 'all',
  search = '',
  source = 'all',
} = {}) {
  if (source === 'deposit_balance' || source === 'deposit') {
    return listDepositBonusUserAccounts({ status, search });
  }

  const pool = getPool();
  await expireStaleBonusUserProgress(pool);

  const params = [];
  let statusClause = '';
  if (['in_progress', 'completed', 'claimed', 'expired', 'cancelled'].includes(status)) {
    statusClause = 'AND p.status = ?';
    params.push(status);
  }

  let searchClause = '';
  const term = String(search || '').trim();
  if (term) {
    const like = `%${term}%`;
    searchClause = `AND (u.name LIKE ? OR u.phone LIKE ? OR CAST(p.user_id AS CHAR) LIKE ? OR CAST(p.id AS CHAR) LIKE ?)`;
    params.push(like, like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT p.*, u.name AS user_name, u.phone AS user_phone
     FROM bonus_user_progress p
     INNER JOIN users u ON u.id = p.user_id
     WHERE 1 = 1
     ${statusClause}
     ${searchClause}
     ORDER BY p.created_at DESC
     LIMIT 500`,
    params,
  );

  return rows.map(formatProgressRow);
}

export async function getAdminBonusProgressById(id) {
  await expireStaleBonusUserProgress();
  return fetchProgressById(id);
}

export async function cancelAdminBonusProgress(id) {
  const pool = getPool();

  const [[depositRow]] = await pool.query(
    `SELECT id FROM user_bonus_accounts WHERE id = ? LIMIT 1`,
    [id],
  );
  if (depositRow) {
    return cancelDepositBonusAccount(id);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[row]] = await connection.query(
      `SELECT * FROM bonus_user_progress WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!row) {
      const error = new Error('Bonus progress record not found');
      error.statusCode = 404;
      throw error;
    }

    if (row.status !== 'in_progress') {
      const error = new Error('Only in-progress bonus records can be cancelled');
      error.statusCode = 400;
      throw error;
    }

    await reverseBonusCredit(connection, row.user_id, row.bonus_amount, row.id, 'cancelled');

    await connection.query(
      `UPDATE bonus_user_progress
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = ?`,
      [id],
    );

    if (row.deposit_transaction_id) {
      await connection.query(
        `UPDATE user_bonus_claims SET status = 'cancelled' WHERE deposit_id = ?`,
        [row.deposit_transaction_id],
      );
    }

    await connection.commit();
    return fetchProgressById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resetAdminBonusProgress(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[row]] = await connection.query(
      `SELECT * FROM bonus_user_progress WHERE id = ? FOR UPDATE`,
      [id],
    );

    if (!row) {
      const error = new Error('Bonus progress record not found');
      error.statusCode = 404;
      throw error;
    }

    if (!['in_progress', 'completed', 'claimed'].includes(row.status)) {
      const error = new Error('Cannot reset expired or cancelled bonus records');
      error.statusCode = 400;
      throw error;
    }

    const calc = calculateBonusProgressFields({
      depositAmount: row.deposit_amount,
      bonusPercent: row.bonus_percent,
      turnoverMultiplier: row.turnover_multiplier,
      completedTurnover: 0,
    });

    await connection.query(
      `UPDATE bonus_user_progress
       SET completed_turnover = 0,
           remaining_turnover = ?,
           progress_percent = 0,
           status = 'in_progress',
           updated_at = NOW()
       WHERE id = ?`,
      [calc.remainingTurnover, id],
    );

    if (row.deposit_transaction_id) {
      await connection.query(
        `UPDATE user_bonus_claims
         SET completed_turnover = 0, status = 'active'
         WHERE deposit_id = ?`,
        [row.deposit_transaction_id],
      );
    }

    await connection.commit();
    return fetchProgressById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listUserBonusProgress(userId) {
  const pool = getPool();
  await expireStaleBonusUserProgress(pool);

  const [rows] = await pool.query(
    `SELECT p.*, u.name AS user_name, u.phone AS user_phone, r.title AS rule_title
     FROM bonus_user_progress p
     INNER JOIN users u ON u.id = p.user_id
     LEFT JOIN bonus_turnover_rules r ON r.id = p.rule_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [userId],
  );

  return rows.map((row) => ({
    ...formatProgressRow(row),
    ruleTitle: row.rule_title || '',
    statusLabel: progressStatusLabel(row.status),
  }));
}

export async function getUserBonusWalletSummary(userId) {
  const records = await listUserBonusProgress(userId);
  const active = records.filter((row) => row.status === 'in_progress');

  const bonusBalance = active.reduce((sum, row) => sum + Number(row.bonusAmount || 0), 0);
  const primary = active[0] || null;

  return {
    bonusBalance: Number(bonusBalance.toFixed(2)),
    hasActiveBonus: active.length > 0,
    activeCount: active.length,
    primaryProgress: primary,
    records: active,
  };
}

export async function hasLockedBonusProgress(userId, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total FROM bonus_user_progress WHERE user_id = ? AND status = 'in_progress'`,
    [userId],
  );
  return Number(row.total || 0) > 0;
}

export default {
  migrateBonusUserProgressSchema,
  calculateBonusProgressFields,
  createBonusUserProgress,
  applyBonusUserProgressTurnover,
  expireStaleBonusUserProgress,
  listAdminBonusProgress,
  getAdminBonusProgressById,
  cancelAdminBonusProgress,
  resetAdminBonusProgress,
  listUserBonusProgress,
  getUserBonusWalletSummary,
  hasLockedBonusProgress,
};
