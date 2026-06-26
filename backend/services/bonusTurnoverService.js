import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta } from './gameWalletService.js';
import { addRequiredTurnover } from './userWalletService.js';
import { notifyBonusReleased } from './notificationService.js';
import {
  applyBonusUserProgressTurnover,
  calculateBonusProgressFields,
  createBonusUserProgress,
} from './bonusUserProgressService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_CACHE_TTL_MS = 30_000;

let activeRulesCache = { data: null, expiresAt: 0 };

function invalidateActiveRulesCache() {
  activeRulesCache = { data: null, expiresAt: 0 };
}

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function formatRuleRow(row) {
  return {
    id: row.id,
    title: row.title,
    bonusPercent: Number(row.bonus_percent),
    minDeposit: Number(row.min_deposit),
    maxDeposit: Number(row.max_deposit),
    userClaimLimit: Number(row.user_claim_limit),
    turnoverMultiplier: Number(row.turnover_multiplier),
    startAt: row.start_at,
    endAt: row.end_at,
    description: row.description || '',
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: computeRuleStatus(row),
  };
}

function formatClaimRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    ruleId: row.rule_id,
    ruleTitle: row.rule_title || row.title || '',
    depositId: row.deposit_id,
    depositAmount: Number(row.deposit_amount),
    bonusAmount: Number(row.bonus_amount),
    requiredTurnover: Number(row.required_turnover),
    completedTurnover: Number(row.completed_turnover),
    status: row.status,
    claimedAt: row.claimed_at,
    expiredAt: row.expired_at,
    progressPercent: Number(row.required_turnover) > 0
      ? Math.min(100, (Number(row.completed_turnover) / Number(row.required_turnover)) * 100)
      : 100,
  };
}

export function computeRuleStatus(rule, now = new Date()) {
  const current = now.getTime();
  const start = new Date(rule.start_at).getTime();
  const end = new Date(rule.end_at).getTime();

  if (!rule.is_active) return 'Disabled';
  if (current < start) return 'Scheduled';
  if (current > end) return 'Expired';
  return 'Active';
}

function toMysqlDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid date/time');
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function validateBonusTurnoverInput(payload = {}, { requireAll = true } = {}) {
  const title = String(payload.title || '').trim();
  const bonusPercent = Number(payload.bonusPercent ?? payload.bonus_percent ?? 0);
  const minDeposit = Number(payload.minDeposit ?? payload.min_deposit ?? 0);
  const maxDeposit = Number(payload.maxDeposit ?? payload.max_deposit ?? 0);
  const userClaimLimit = Number(payload.userClaimLimit ?? payload.user_claim_limit ?? 1);
  const turnoverMultiplier = Number(payload.turnoverMultiplier ?? payload.turnover_multiplier ?? 1);
  const startAt = payload.startAt ?? payload.start_at;
  const endAt = payload.endAt ?? payload.end_at;
  const description = String(payload.description || '').trim();
  const isActive = payload.isActive !== false && payload.is_active !== false;

  if (requireAll || payload.title !== undefined) {
    if (!title) {
      const error = new Error('Bonus title is required');
      error.statusCode = 400;
      throw error;
    }
    if (title.length > 200) {
      const error = new Error('Bonus title is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
    const error = new Error('Bonus percentage must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(minDeposit) || minDeposit < 0) {
    const error = new Error('Minimum deposit must be 0 or greater');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(maxDeposit) || maxDeposit <= 0 || maxDeposit < minDeposit) {
    const error = new Error('Maximum deposit must be greater than minimum deposit');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(userClaimLimit) || userClaimLimit < 1) {
    const error = new Error('User claim limit must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(turnoverMultiplier) || turnoverMultiplier <= 0) {
    const error = new Error('Turnover multiplier must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  const safeStartAt = toMysqlDateTime(startAt);
  const safeEndAt = toMysqlDateTime(endAt);

  if (new Date(safeEndAt).getTime() <= new Date(safeStartAt).getTime()) {
    const error = new Error('End date must be after start date');
    error.statusCode = 400;
    throw error;
  }

  if (description.length > 10000) {
    const error = new Error('Description is too long');
    error.statusCode = 400;
    throw error;
  }

  return {
    title,
    bonusPercent: Number(bonusPercent.toFixed(2)),
    minDeposit: Number(minDeposit.toFixed(2)),
    maxDeposit: Number(maxDeposit.toFixed(2)),
    userClaimLimit,
    turnoverMultiplier: Number(turnoverMultiplier.toFixed(2)),
    startAt: safeStartAt,
    endAt: safeEndAt,
    description: description || null,
    isActive,
  };
}

export async function migrateBonusTurnoverSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'bonus_turnover.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }
}

export async function listBonusTurnoverRules() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM bonus_turnover_rules ORDER BY start_at DESC, id DESC`,
  );
  return rows.map(formatRuleRow);
}

export async function listActiveBonusTurnoverRules() {
  const now = Date.now();
  if (activeRulesCache.data && activeRulesCache.expiresAt > now) {
    return activeRulesCache.data;
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, bonus_percent, min_deposit, max_deposit, user_claim_limit, turnover_multiplier, start_at, end_at, description, is_active
     FROM bonus_turnover_rules
     WHERE is_active = 1 AND start_at <= NOW() AND end_at >= NOW()
     ORDER BY bonus_percent DESC, id DESC`,
  );

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    bonusPercent: Number(row.bonus_percent),
    minDeposit: Number(row.min_deposit),
    maxDeposit: Number(row.max_deposit),
    userClaimLimit: Number(row.user_claim_limit),
    turnoverMultiplier: Number(row.turnover_multiplier),
    startAt: row.start_at,
    endAt: row.end_at,
    description: row.description || '',
  }));

  activeRulesCache = { data, expiresAt: now + ACTIVE_CACHE_TTL_MS };
  return data;
}

export async function getBonusTurnoverRuleById(id, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT * FROM bonus_turnover_rules WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!row) {
    const error = new Error('Bonus turnover rule not found');
    error.statusCode = 404;
    throw error;
  }

  return formatRuleRow(row);
}

export async function createBonusTurnoverRule(payload) {
  const pool = getPool();
  const data = validateBonusTurnoverInput(payload, { requireAll: true });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO bonus_turnover_rules
        (title, bonus_percent, min_deposit, max_deposit, user_claim_limit, turnover_multiplier, start_at, end_at, description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.bonusPercent,
        data.minDeposit,
        data.maxDeposit,
        data.userClaimLimit,
        data.turnoverMultiplier,
        data.startAt,
        data.endAt,
        data.description,
        data.isActive ? 1 : 0,
      ],
    );

    const rule = await getBonusTurnoverRuleById(result.insertId, connection);
    await connection.commit();
    invalidateActiveRulesCache();
    return rule;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateBonusTurnoverRule(id, payload) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const existing = await getBonusTurnoverRuleById(id, connection);
    const merged = {
      title: payload.title ?? existing.title,
      bonusPercent: payload.bonusPercent ?? payload.bonus_percent ?? existing.bonusPercent,
      minDeposit: payload.minDeposit ?? payload.min_deposit ?? existing.minDeposit,
      maxDeposit: payload.maxDeposit ?? payload.max_deposit ?? existing.maxDeposit,
      userClaimLimit: payload.userClaimLimit ?? payload.user_claim_limit ?? existing.userClaimLimit,
      turnoverMultiplier: payload.turnoverMultiplier ?? payload.turnover_multiplier ?? existing.turnoverMultiplier,
      startAt: payload.startAt ?? payload.start_at ?? existing.startAt,
      endAt: payload.endAt ?? payload.end_at ?? existing.endAt,
      description: payload.description ?? existing.description,
      isActive: payload.isActive ?? payload.is_active ?? existing.isActive,
    };
    const data = validateBonusTurnoverInput(merged, { requireAll: true });

    await connection.query(
      `UPDATE bonus_turnover_rules
       SET title = ?, bonus_percent = ?, min_deposit = ?, max_deposit = ?, user_claim_limit = ?, turnover_multiplier = ?, start_at = ?, end_at = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [
        data.title,
        data.bonusPercent,
        data.minDeposit,
        data.maxDeposit,
        data.userClaimLimit,
        data.turnoverMultiplier,
        data.startAt,
        data.endAt,
        data.description,
        data.isActive ? 1 : 0,
        id,
      ],
    );

    const rule = await getBonusTurnoverRuleById(id, connection);
    await connection.commit();
    invalidateActiveRulesCache();
    return rule;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteBonusTurnoverRule(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getBonusTurnoverRuleById(id, connection);
    await connection.query(`DELETE FROM bonus_turnover_rules WHERE id = ?`, [id]);
    await connection.commit();
    invalidateActiveRulesCache();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function countUserRuleClaims(connection, userId, ruleId) {
  const [[row]] = await connection.query(
    `SELECT COUNT(*) AS total FROM user_bonus_claims WHERE user_id = ? AND rule_id = ?`,
    [userId, ruleId],
  );
  return Number(row.total || 0);
}

async function findBestMatchingRule(connection, userId, depositAmount) {
  const [rules] = await connection.query(
    `SELECT *
     FROM bonus_turnover_rules
     WHERE is_active = 1 AND start_at <= NOW() AND end_at >= NOW()
       AND ? >= min_deposit AND ? <= max_deposit
     ORDER BY bonus_percent DESC, id DESC`,
    [depositAmount, depositAmount],
  );

  for (const rule of rules) {
    const claimCount = await countUserRuleClaims(connection, userId, rule.id);
    if (claimCount >= Number(rule.user_claim_limit)) continue;
    return rule;
  }

  return null;
}

export async function processDepositBonusTurnover(connection, transaction) {
  if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'approved') {
    return null;
  }

  const userId = Number(transaction.user_id);
  const depositId = Number(transaction.id);
  const depositAmount = Number(transaction.amount);

  const [[existingClaim]] = await connection.query(
    `SELECT id FROM user_bonus_claims WHERE deposit_id = ? LIMIT 1`,
    [depositId],
  );
  if (existingClaim) return null;

  const rule = await findBestMatchingRule(connection, userId, depositAmount);
  if (!rule) return null;

  const claimCount = await countUserRuleClaims(connection, userId, rule.id);
  if (claimCount >= Number(rule.user_claim_limit)) return null;

  const bonusAmount = Number(((depositAmount * Number(rule.bonus_percent)) / 100).toFixed(2));
  if (bonusAmount <= 0) return null;

  const calc = calculateBonusProgressFields({
    depositAmount,
    bonusPercent: rule.bonus_percent,
    turnoverMultiplier: rule.turnover_multiplier,
    completedTurnover: 0,
  });
  const requiredTurnover = calc.requiredTurnover;
  const bonusTurnoverAdd = Number(
    (requiredTurnover - depositAmount).toFixed(2),
  );

  await applyBalanceDelta(connection, userId, bonusAmount);

  const [txResult] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, `bonus_turnover:${rule.id}:${depositId}`],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, `${rule.title} Bonus`, bonusAmount, txResult.insertId],
  );

  if (bonusTurnoverAdd > 0) {
    await addRequiredTurnover(userId, bonusTurnoverAdd, 'bonus_turnover', connection);
  }

  const [claimResult] = await connection.query(
    `INSERT INTO user_bonus_claims
      (user_id, rule_id, deposit_id, deposit_amount, bonus_amount, required_turnover, completed_turnover, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'active')`,
    [userId, rule.id, depositId, depositAmount, bonusAmount, requiredTurnover],
  );

  await createBonusUserProgress(connection, {
    userId,
    ruleId: rule.id,
    depositTransactionId: depositId,
    depositAmount,
    bonusPercent: rule.bonus_percent,
    turnoverMultiplier: rule.turnover_multiplier,
  });

  return {
    claimId: claimResult.insertId,
    ruleId: rule.id,
    ruleTitle: rule.title,
    bonusAmount,
    requiredTurnover,
  };
}

export async function finalizeDepositBonusNotification(userId, bonusResult) {
  if (!bonusResult?.bonusAmount) return;
  try {
    await notifyBonusReleased(
      userId,
      bonusResult.bonusAmount,
      `${bonusResult.ruleTitle} bonus credited`,
    );
  } catch (error) {
    console.error('Bonus turnover notification error:', error);
  }
}

export async function applyBonusClaimTurnover(connection, userId, betAmount) {
  const amount = Number(betAmount);
  if (!amount || amount <= 0) return;

  let remaining = amount;
  const [claims] = await connection.query(
    `SELECT id, required_turnover, completed_turnover
     FROM user_bonus_claims
     WHERE user_id = ? AND status = 'active'
     ORDER BY claimed_at ASC`,
    [userId],
  );

  for (const claim of claims) {
    if (remaining <= 0) break;

    const required = Number(claim.required_turnover);
    const completed = Number(claim.completed_turnover);
    const need = Math.max(0, required - completed);
    if (need <= 0) {
      await connection.query(
        `UPDATE user_bonus_claims SET status = 'completed' WHERE id = ? AND status = 'active'`,
        [claim.id],
      );
      continue;
    }

    const applied = Math.min(remaining, need);
    await connection.query(
      `UPDATE user_bonus_claims SET completed_turnover = completed_turnover + ? WHERE id = ?`,
      [applied, claim.id],
    );
    remaining -= applied;

    await connection.query(
      `UPDATE user_bonus_claims
       SET status = 'completed'
       WHERE id = ? AND completed_turnover >= required_turnover AND status = 'active'`,
      [claim.id],
    );
  }

  await applyBonusUserProgressTurnover(connection, userId, betAmount);
}

export async function listUserBonusClaims(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.*, r.title AS rule_title
     FROM bonus_user_progress p
     LEFT JOIN bonus_turnover_rules r ON r.id = p.rule_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [userId],
  );

  return rows.map((row) => {
    const formatted = {
      id: row.id,
      userId: row.user_id,
      ruleId: row.rule_id,
      ruleTitle: row.rule_title || '',
      depositId: row.deposit_transaction_id,
      depositAmount: Number(row.deposit_amount),
      bonusPercent: Number(row.bonus_percent),
      bonusAmount: Number(row.bonus_amount),
      turnoverMultiplier: Number(row.turnover_multiplier),
      requiredTurnover: Number(row.required_turnover),
      completedTurnover: Number(row.completed_turnover),
      remainingTurnover: Number(row.remaining_turnover),
      status: row.status,
      claimedAt: row.created_at,
      expiredAt: row.status === 'expired' ? row.updated_at : null,
      progressPercent: Number(row.progress_percent),
      claimCount: Number(row.claim_count),
    };
    return formatted;
  });
}

export default {
  migrateBonusTurnoverSchema,
  listBonusTurnoverRules,
  listActiveBonusTurnoverRules,
  createBonusTurnoverRule,
  updateBonusTurnoverRule,
  deleteBonusTurnoverRule,
  processDepositBonusTurnover,
  finalizeDepositBonusNotification,
  applyBonusClaimTurnover,
  listUserBonusClaims,
  invalidateActiveRulesCache,
};
