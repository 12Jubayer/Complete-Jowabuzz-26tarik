import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta } from './gameWalletService.js';
import { addRequiredTurnover, ensureUserWallet } from './userWalletService.js';
import { notifyBonusReleased } from './notificationService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_CACHE_TTL_MS = 30_000;
const DEFAULT_RULE_END = '2099-12-31 23:59:59';

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

function toMysqlDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid date/time');
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function computeProgress(completed, required) {
  const req = Number(required);
  const comp = Number(completed);
  if (req <= 0) return 100;
  return Number(Math.min(100, (comp / req) * 100).toFixed(2));
}

function formatRuleStatus(rule, now = new Date()) {
  const current = now.getTime();
  const start = new Date(rule.start_date).getTime();
  const end = new Date(rule.end_date).getTime();
  if (!rule.is_active) return 'Inactive';
  if (current < start) return 'Scheduled';
  if (current > end) return 'Expired';
  return 'Active';
}

function formatRuleRow(row) {
  return {
    id: row.id,
    title: row.title,
    bonusPercent: Number(row.bonus_percent),
    turnoverMultiplier: Number(row.turnover_multiplier),
    minDeposit: Number(row.min_deposit),
    maxDeposit: Number(row.max_deposit),
    claimLimit: Number(row.claim_limit),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: formatRuleStatus(row),
  };
}

function formatAccountRow(row) {
  const required = Number(row.required_turnover);
  const completed = Number(row.completed_turnover);
  const progress = Number(row.progress ?? computeProgress(completed, required));
  const remaining = Number(
    row.remaining_turnover ?? Math.max(0, required - completed).toFixed(2),
  );
  const bonusPercent = Number(
    row.bonus_percent ?? (row.deposit_amount > 0
      ? (Number(row.bonus_amount) / Number(row.deposit_amount)) * 100
      : 0),
  );

  return {
    id: row.id,
    userId: row.user_id,
    ruleId: row.rule_id,
    ruleTitle: row.rule_title || '',
    userName: row.user_name || '',
    userPhone: row.user_phone || '',
    depositAmount: Number(row.deposit_amount),
    bonusPercent: Number(bonusPercent.toFixed(2)),
    bonusAmount: Number(row.bonus_amount),
    turnoverMultiplier: Number(row.turnover_multiplier ?? 1),
    claimLimit: Number(row.claim_limit ?? 0),
    requiredTurnover: required,
    completedTurnover: completed,
    remainingTurnover: remaining,
    progress,
    progressPercent: progress,
    status: row.status,
    claimCount: Number(row.claim_count ?? 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resolveRuleDates(startDate, endDate) {
  const hasStart =
    startDate !== undefined && startDate !== null && String(startDate).trim() !== '';
  const hasEnd = endDate !== undefined && endDate !== null && String(endDate).trim() !== '';

  if (!hasStart && !hasEnd) {
    return {
      startDate: toMysqlDateTime(new Date()),
      endDate: DEFAULT_RULE_END,
    };
  }

  const safeStart = hasStart ? toMysqlDateTime(startDate) : toMysqlDateTime(new Date());
  const safeEnd = hasEnd ? toMysqlDateTime(endDate) : DEFAULT_RULE_END;

  if (new Date(safeEnd).getTime() <= new Date(safeStart).getTime()) {
    const error = new Error('End date must be after start date');
    error.statusCode = 400;
    throw error;
  }

  return { startDate: safeStart, endDate: safeEnd };
}

export function validateDepositBonusRuleInput(payload = {}, { requireAll = true } = {}) {
  const title = String(payload.title || '').trim();
  const bonusPercent = Number(payload.bonusPercent ?? payload.bonus_percent ?? 0);
  const turnoverMultiplier = Number(payload.turnoverMultiplier ?? payload.turnover_multiplier ?? 1);
  const minDeposit = Number(payload.minDeposit ?? payload.min_deposit ?? 0);
  const maxDeposit = Number(payload.maxDeposit ?? payload.max_deposit ?? 0);
  const claimLimit = Number(payload.claimLimit ?? payload.claim_limit ?? 1);
  const startDate = payload.startDate ?? payload.start_date;
  const endDate = payload.endDate ?? payload.end_date;
  const isActive = payload.isActive !== false && payload.is_active !== false;

  if (requireAll || payload.title !== undefined) {
    if (!title) {
      const error = new Error('Rule title is required');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 100) {
    const error = new Error('Bonus percent must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(turnoverMultiplier) || turnoverMultiplier <= 0) {
    const error = new Error('Turnover multiplier must be greater than 0');
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

  if (!Number.isInteger(claimLimit) || claimLimit < 1) {
    const error = new Error('Claim limit must be at least 1');
    error.statusCode = 400;
    throw error;
  }

  const { startDate: safeStart, endDate: safeEnd } = resolveRuleDates(startDate, endDate);

  return {
    title,
    bonusPercent: Number(bonusPercent.toFixed(2)),
    turnoverMultiplier: Number(turnoverMultiplier.toFixed(2)),
    minDeposit: Number(minDeposit.toFixed(2)),
    maxDeposit: Number(maxDeposit.toFixed(2)),
    claimLimit,
    startDate: safeStart,
    endDate: safeEnd,
    isActive,
  };
}

export async function migrateDepositBonusSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'deposit_bonus.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await ensureDepositBonusAccountColumns(pool);
  await ensureDepositRequestBonusColumn(pool);
}

async function ensureDepositRequestBonusColumn(pool) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM deposit_requests LIKE ?`, ['bonus_rule_id']);
  if (!rows.length) {
    await pool.query(
      `ALTER TABLE deposit_requests
       ADD COLUMN bonus_rule_id BIGINT NULL AFTER channel,
       ADD INDEX idx_deposit_requests_bonus_rule (bonus_rule_id)`,
    );
  }
}

async function ensureDepositBonusAccountColumns(pool) {
  const columns = [
    {
      name: 'bonus_percent',
      ddl: 'ADD COLUMN bonus_percent DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER deposit_amount',
    },
    {
      name: 'turnover_multiplier',
      ddl: 'ADD COLUMN turnover_multiplier DECIMAL(8, 2) NOT NULL DEFAULT 1 AFTER bonus_amount',
    },
    {
      name: 'remaining_turnover',
      ddl: 'ADD COLUMN remaining_turnover DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER completed_turnover',
    },
  ];

  for (const column of columns) {
    const [rows] = await pool.query(`SHOW COLUMNS FROM user_bonus_accounts LIKE ?`, [column.name]);
    if (!rows.length) {
      await pool.query(`ALTER TABLE user_bonus_accounts ${column.ddl}`);
    }
  }

  await pool.query(
    `UPDATE user_bonus_accounts a
     INNER JOIN deposit_bonus_rules r ON r.id = a.rule_id
     SET
       a.bonus_percent = CASE
         WHEN a.bonus_percent = 0 AND a.deposit_amount > 0
           THEN ROUND((a.bonus_amount / a.deposit_amount) * 100, 2)
         ELSE COALESCE(NULLIF(a.bonus_percent, 0), r.bonus_percent)
       END,
       a.turnover_multiplier = COALESCE(NULLIF(a.turnover_multiplier, 0), r.turnover_multiplier),
       a.remaining_turnover = GREATEST(0, a.required_turnover - a.completed_turnover)
     WHERE a.bonus_percent = 0 OR a.remaining_turnover = 0`,
  );
}

async function getRuleById(id, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(`SELECT * FROM deposit_bonus_rules WHERE id = ? LIMIT 1`, [id]);
  if (!row) {
    const error = new Error('Deposit bonus rule not found');
    error.statusCode = 404;
    throw error;
  }
  return formatRuleRow(row);
}

export async function getDepositBonusSummary() {
  const pool = getPool();
  const [[rulesSummary]] = await pool.query(
    `SELECT
       COUNT(*) AS total_rules,
       SUM(CASE WHEN is_active = 1 AND start_date <= NOW() AND end_date >= NOW() THEN 1 ELSE 0 END) AS active_rules
     FROM deposit_bonus_rules`,
  );
  const [[accountsSummary]] = await pool.query(
    `SELECT
       COUNT(*) AS active_user_bonuses,
       COALESCE(SUM(bonus_amount), 0) AS total_active_bonus_amount
     FROM user_bonus_accounts
     WHERE status = 'in_progress'`,
  );

  return {
    totalRules: Number(rulesSummary.total_rules || 0),
    activeRules: Number(rulesSummary.active_rules || 0),
    activeUserBonuses: Number(accountsSummary.active_user_bonuses || 0),
    totalActiveBonusAmount: Number(accountsSummary.total_active_bonus_amount || 0),
  };
}

export async function listDepositBonusRules() {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM deposit_bonus_rules ORDER BY id DESC`);
  const summary = await getDepositBonusSummary();
  return { rules: rows.map(formatRuleRow), summary };
}

export async function listActiveDepositBonusRules() {
  const now = Date.now();
  if (activeRulesCache.data && activeRulesCache.expiresAt > now) {
    return activeRulesCache.data;
  }

  const pool = getPool();
  const [[autoRule]] = await pool.query(
    `SELECT id FROM deposit_bonus_rules
     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
     ORDER BY bonus_percent ASC, id ASC
     LIMIT 1`,
  );
  const automaticRuleId = Number(autoRule?.id || 0);

  const [rows] = await pool.query(
    `SELECT id, title, bonus_percent, turnover_multiplier, min_deposit, max_deposit, claim_limit, start_date, end_date
     FROM deposit_bonus_rules
     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
       AND id <> ?
     ORDER BY bonus_percent DESC, id DESC`,
    [automaticRuleId],
  );

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    bonusPercent: Number(row.bonus_percent),
    turnoverMultiplier: Number(row.turnover_multiplier),
    minDeposit: Number(row.min_deposit),
    maxDeposit: Number(row.max_deposit),
    claimLimit: Number(row.claim_limit),
    startDate: row.start_date,
    endDate: row.end_date,
  }));

  activeRulesCache = { data, expiresAt: now + ACTIVE_CACHE_TTL_MS };
  return data;
}

export async function createDepositBonusRule(payload) {
  const pool = getPool();
  const data = validateDepositBonusRuleInput(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO deposit_bonus_rules
         (title, bonus_percent, turnover_multiplier, min_deposit, max_deposit, claim_limit, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.bonusPercent,
        data.turnoverMultiplier,
        data.minDeposit,
        data.maxDeposit,
        data.claimLimit,
        data.startDate,
        data.endDate,
        data.isActive ? 1 : 0,
      ],
    );
    const rule = await getRuleById(result.insertId, connection);
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

export async function updateDepositBonusRule(id, payload) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const existing = await getRuleById(id, connection);
    const merged = {
      title: payload.title ?? existing.title,
      bonusPercent: payload.bonusPercent ?? payload.bonus_percent ?? existing.bonusPercent,
      turnoverMultiplier:
        payload.turnoverMultiplier ?? payload.turnover_multiplier ?? existing.turnoverMultiplier,
      minDeposit: payload.minDeposit ?? payload.min_deposit ?? existing.minDeposit,
      maxDeposit: payload.maxDeposit ?? payload.max_deposit ?? existing.maxDeposit,
      claimLimit: payload.claimLimit ?? payload.claim_limit ?? existing.claimLimit,
      startDate: payload.startDate ?? payload.start_date ?? existing.startDate,
      endDate: payload.endDate ?? payload.end_date ?? existing.endDate,
      isActive: payload.isActive ?? payload.is_active ?? existing.isActive,
    };
    const data = validateDepositBonusRuleInput(merged);

    await connection.query(
      `UPDATE deposit_bonus_rules
       SET title = ?, bonus_percent = ?, turnover_multiplier = ?, min_deposit = ?, max_deposit = ?,
           claim_limit = ?, start_date = ?, end_date = ?, is_active = ?
       WHERE id = ?`,
      [
        data.title,
        data.bonusPercent,
        data.turnoverMultiplier,
        data.minDeposit,
        data.maxDeposit,
        data.claimLimit,
        data.startDate,
        data.endDate,
        data.isActive ? 1 : 0,
        id,
      ],
    );

    const rule = await getRuleById(id, connection);
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

export async function deleteDepositBonusRule(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getRuleById(id, connection);
    await connection.query(`DELETE FROM deposit_bonus_rules WHERE id = ?`, [id]);
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

export async function listDepositBonusUserAccounts({ status = 'all', search = '' } = {}) {
  const pool = getPool();
  await expireStaleBonusAccounts(pool);

  const params = [];
  let statusClause = '';
  if (['in_progress', 'completed', 'expired', 'cancelled'].includes(status)) {
    statusClause = 'AND a.status = ?';
    params.push(status);
  }

  let searchClause = '';
  const term = String(search || '').trim();
  if (term) {
    const like = `%${term}%`;
    searchClause = `AND (u.name LIKE ? OR u.phone LIKE ? OR CAST(a.id AS CHAR) LIKE ?)`;
    params.push(like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT
       a.*,
       r.title AS rule_title,
       r.claim_limit,
       u.name AS user_name,
       u.phone AS user_phone,
       (
         SELECT COUNT(*)
         FROM user_bonus_accounts c
         WHERE c.user_id = a.user_id AND c.rule_id = a.rule_id
           AND c.status IN ('in_progress', 'completed')
           AND c.id <= a.id
       ) AS claim_count
     FROM user_bonus_accounts a
     INNER JOIN deposit_bonus_rules r ON r.id = a.rule_id
     INNER JOIN users u ON u.id = a.user_id
     WHERE 1 = 1
     ${statusClause}
     ${searchClause}
     ORDER BY a.created_at DESC
     LIMIT 500`,
    params,
  );

  return rows.map(formatAccountRow);
}

async function countUserRuleClaims(connection, userId, ruleId) {
  const [[row]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM user_bonus_accounts
     WHERE user_id = ? AND rule_id = ? AND status IN ('in_progress', 'completed', 'cancelled')`,
    [userId, ruleId],
  );
  return Number(row.total || 0);
}

async function findEligibleRuleById(connection, userId, depositAmount, ruleId) {
  const [[rule]] = await connection.query(
    `SELECT *
     FROM deposit_bonus_rules
     WHERE id = ?
       AND is_active = 1
       AND start_date <= NOW()
       AND end_date >= NOW()
       AND ? >= min_deposit
       AND ? <= max_deposit
     LIMIT 1`,
    [ruleId, depositAmount, depositAmount],
  );
  if (!rule) return null;

  const claimCount = await countUserRuleClaims(connection, userId, rule.id);
  if (claimCount >= Number(rule.claim_limit)) return null;
  return rule;
}

async function findDefaultDepositBonusRule(connection, userId, depositAmount) {
  const [rules] = await connection.query(
    `SELECT *
     FROM deposit_bonus_rules
     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
       AND ? >= min_deposit AND ? <= max_deposit
     ORDER BY claim_limit DESC, bonus_percent ASC, id ASC`,
    [depositAmount, depositAmount],
  );

  for (const rule of rules) {
    const claimCount = await countUserRuleClaims(connection, userId, rule.id);
    if (claimCount >= Number(rule.claim_limit)) continue;
    return rule;
  }

  return null;
}

async function resolveDepositBonusRules(connection, userId, depositAmount, depositTxId) {
  const [[depositRequest]] = await connection.query(
    `SELECT bonus_rule_id FROM deposit_requests WHERE transaction_id = ? LIMIT 1`,
    [depositTxId],
  );
  const selectedRuleId = Number(depositRequest?.bonus_rule_id || 0);
  const rules = [];

  const automaticRule = await findDefaultDepositBonusRule(connection, userId, depositAmount);
  if (automaticRule) rules.push(automaticRule);

  if (selectedRuleId > 0) {
    const promoRule = await findEligibleRuleById(connection, userId, depositAmount, selectedRuleId);
    if (promoRule && (!automaticRule || promoRule.id !== automaticRule.id)) {
      rules.push(promoRule);
    }
  }

  return rules;
}

async function reverseBonusCredit(connection, userId, bonusAmount, accountId, reason) {
  const amount = Number(bonusAmount);
  if (amount <= 0) return;

  const [[released]] = await connection.query(
    `SELECT id FROM transactions
     WHERE user_id = ? AND type = 'bonus' AND method = ?
     LIMIT 1`,
    [userId, `deposit_bonus_released:${accountId}`],
  );

  if (released) {
    await applyBalanceDelta(connection, userId, -amount);
    await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
      [userId, -amount, `deposit_bonus_reversal:${accountId}:${reason}`],
    );
  } else {
    const [[account]] = await connection.query(
      `SELECT rule_id, deposit_transaction_id FROM user_bonus_accounts WHERE id = ? LIMIT 1`,
      [accountId],
    );
    if (account?.deposit_transaction_id) {
      await connection.query(
        `UPDATE transactions
         SET status = 'cancelled', method = ?
         WHERE user_id = ? AND type = 'bonus' AND status = 'pending' AND method = ?`,
        [
          `deposit_bonus_cancelled:${accountId}:${reason}`,
          userId,
          `deposit_bonus_pending:${account.rule_id}:${account.deposit_transaction_id}`,
        ],
      );
    }
  }
}

export async function expireStaleBonusAccounts(db = null) {
  const pool = db || getPool();
  const connection = db ? null : await pool.getConnection();
  const executor = connection || pool;

  try {
    if (connection) await connection.beginTransaction();

    const [rows] = await executor.query(
      `SELECT a.id, a.user_id, a.bonus_amount, a.status, r.end_date
       FROM user_bonus_accounts a
       INNER JOIN deposit_bonus_rules r ON r.id = a.rule_id
       WHERE a.status = 'in_progress' AND r.end_date < NOW()`,
    );

    for (const row of rows) {
      await reverseBonusCredit(executor, row.user_id, row.bonus_amount, row.id, 'expired');
      await executor.query(
        `UPDATE user_bonus_accounts SET status = 'expired', updated_at = NOW() WHERE id = ?`,
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

export async function cancelDepositBonusAccount(accountId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[account]] = await connection.query(
      `SELECT * FROM user_bonus_accounts WHERE id = ? FOR UPDATE`,
      [accountId],
    );

    if (!account) {
      const error = new Error('Bonus account not found');
      error.statusCode = 404;
      throw error;
    }

    if (account.status !== 'in_progress') {
      const error = new Error('Only in-progress bonus accounts can be cancelled');
      error.statusCode = 400;
      throw error;
    }

    await reverseBonusCredit(connection, account.user_id, account.bonus_amount, account.id, 'cancelled');
    await connection.query(
      `UPDATE user_bonus_accounts SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [accountId],
    );

    await connection.commit();
    return formatAccountRow(account);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rolloverDepositTurnoverCycle(connection, userId) {
  const [accounts] = await connection.query(
    `SELECT id, required_turnover, completed_turnover, remaining_turnover
     FROM user_bonus_accounts
     WHERE user_id = ? AND status = 'in_progress'
     FOR UPDATE`,
    [userId],
  );

  let carryForward = 0;
  for (const account of accounts) {
    const remaining = Number(
      account.remaining_turnover ??
        Math.max(0, Number(account.required_turnover) - Number(account.completed_turnover)),
    );
    if (remaining > 0) carryForward += remaining;
  }

  if (accounts.length > 0) {
    await connection.query(
      `UPDATE user_bonus_accounts
       SET status = 'cancelled', deposit_transaction_id = NULL, updated_at = NOW()
       WHERE user_id = ? AND status = 'in_progress'`,
      [userId],
    );
  }

  await ensureUserWallet(userId, connection);
  await connection.query(
    `UPDATE user_wallets SET completed_turnover = 0 WHERE user_id = ?`,
    [userId],
  );

  return Number(carryForward.toFixed(2));
}

function aggregateInProgressAccounts(rows) {
  if (!rows.length) return null;

  const requiredTurnover = rows.reduce((sum, row) => sum + Number(row.requiredTurnover || 0), 0);
  const completedTurnover = rows.reduce((sum, row) => sum + Number(row.completedTurnover || 0), 0);
  const remainingTurnover = Math.max(0, requiredTurnover - completedTurnover);
  const progress =
    requiredTurnover > 0
      ? Number(Math.min(100, (completedTurnover / requiredTurnover) * 100).toFixed(2))
      : 100;

  return {
    ...rows[0],
    ruleTitle: rows.length > 1 ? 'Combined Deposit Bonus' : rows[0].ruleTitle,
    requiredTurnover: Number(requiredTurnover.toFixed(2)),
    completedTurnover: Number(completedTurnover.toFixed(2)),
    remainingTurnover: Number(remainingTurnover.toFixed(2)),
    progress,
    progressPercent: progress,
    status: 'in_progress',
  };
}

function calcRuleBonusAmount(depositAmount, rule) {
  return Number(((depositAmount * Number(rule.bonus_percent)) / 100).toFixed(2));
}

async function releaseLockedDepositBonus(connection, userId, account) {
  const bonusAmount = Number(account.bonus_amount || 0);
  if (bonusAmount <= 0) return;

  const [[released]] = await connection.query(
    `SELECT id FROM transactions
     WHERE user_id = ? AND type = 'bonus' AND method = ?
     LIMIT 1`,
    [userId, `deposit_bonus_released:${account.id}`],
  );
  if (released) return;

  await applyBalanceDelta(connection, userId, bonusAmount);

  const [bonusTx] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, `deposit_bonus_released:${account.id}`],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, 'Deposit Bonus Released', bonusAmount, bonusTx.insertId],
  );
}

export async function processDepositBalanceBonus(connection, transaction) {
  if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'approved') {
    return null;
  }

  const userId = Number(transaction.user_id);
  const depositTxId = Number(transaction.id);
  const depositAmount = Number(transaction.amount);

  const [[existing]] = await connection.query(
    `SELECT id FROM user_bonus_accounts WHERE deposit_transaction_id = ? LIMIT 1`,
    [depositTxId],
  );
  if (existing) return null;

  const carryForwardRemaining = await rolloverDepositTurnoverCycle(connection, userId);
  const rules = await resolveDepositBonusRules(connection, userId, depositAmount, depositTxId);
  if (!rules.length) return null;

  const automaticRule = rules[0];
  const promoRule = rules.find((rule) => rule.id !== automaticRule?.id) || null;

  const autoBonusAmount = automaticRule ? calcRuleBonusAmount(depositAmount, automaticRule) : 0;
  const promoBonusAmount = promoRule ? calcRuleBonusAmount(depositAmount, promoRule) : 0;
  const lockedBonusAmount = Number(promoBonusAmount.toFixed(2));
  if (autoBonusAmount <= 0 && lockedBonusAmount <= 0) return null;

  const turnoverBase = Number((depositAmount + autoBonusAmount).toFixed(2));
  const turnoverMultiplier = promoRule
    ? Number(promoRule.turnover_multiplier)
    : Number(automaticRule?.turnover_multiplier || 1);
  const primaryRule = promoRule || automaticRule;
  const requiredTurnover = Number(
    (turnoverBase * turnoverMultiplier + carryForwardRemaining).toFixed(2),
  );
  const remainingTurnover = requiredTurnover;
  const accountBonusPercent = lockedBonusAmount > 0
    ? Number(promoRule.bonus_percent)
    : Number(automaticRule?.bonus_percent || 0);
  const accountBonusAmount = lockedBonusAmount > 0 ? lockedBonusAmount : 0;

  if (autoBonusAmount > 0 && automaticRule) {
    await applyBalanceDelta(connection, userId, autoBonusAmount);
    const [autoTx] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
      [userId, autoBonusAmount, `deposit_bonus_auto:${automaticRule.id}:${depositTxId}`],
    );
    await connection.query(
      `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
       VALUES (?, ?, ?, 'approved', ?)`,
      [userId, `${automaticRule.title} Bonus`, autoBonusAmount, autoTx.insertId],
    );
  }

  if (lockedBonusAmount > 0 && promoRule) {
    const [pendingTx] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'bonus', ?, 'pending', ?, NOW())`,
      [userId, lockedBonusAmount, `deposit_bonus_pending:${promoRule.id}:${depositTxId}`],
    );
    await connection.query(
      `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
       VALUES (?, ?, ?, 'pending', ?)`,
      [userId, `${promoRule.title} Bonus (locked)`, lockedBonusAmount, pendingTx.insertId],
    );
  }

  const [accountResult] = await connection.query(
    `INSERT INTO user_bonus_accounts
       (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
        turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 'in_progress')`,
    [
      userId,
      primaryRule.id,
      depositTxId,
      depositAmount,
      accountBonusPercent,
      accountBonusAmount,
      turnoverMultiplier,
      requiredTurnover,
      remainingTurnover,
    ],
  );

  await connection.query(
    `UPDATE user_wallets SET required_turnover = ? WHERE user_id = ?`,
    [requiredTurnover, userId],
  );
  await connection.query(
    `INSERT INTO turnover_records (user_id, source_type, source_amount, turnover_amount)
     VALUES (?, 'deposit_bonus', ?, ?)`,
    [userId, autoBonusAmount + lockedBonusAmount, requiredTurnover],
  );

  return {
    accountId: accountResult.insertId,
    ruleId: primaryRule.id,
    ruleTitle: primaryRule.title,
    bonusAmount: Number((autoBonusAmount + lockedBonusAmount).toFixed(2)),
    autoBonusAmount,
    lockedBonusAmount,
    bonusPercent: accountBonusPercent,
    turnoverMultiplier,
    requiredTurnover,
    lockedUntilTurnover: lockedBonusAmount > 0,
  };
}

export async function finalizeDepositBalanceBonusNotification(userId, bonusResult) {
  if (!bonusResult?.bonusAmount) return;
  try {
    await notifyBonusReleased(
      userId,
      bonusResult.bonusAmount,
      `${bonusResult.ruleTitle} bonus credited`,
    );
  } catch (error) {
    console.error('Deposit balance bonus notification error:', error);
  }
}

export async function applyDepositBonusTurnover(connection, userId, betAmount) {
  const amount = Number(betAmount);
  if (!amount || amount <= 0) return;

  let remaining = amount;
  const [accounts] = await connection.query(
    `SELECT id, required_turnover, completed_turnover, bonus_amount, status
     FROM user_bonus_accounts
     WHERE user_id = ? AND status = 'in_progress'
     ORDER BY created_at ASC
     FOR UPDATE`,
    [userId],
  );

  for (const account of accounts) {
    if (remaining <= 0) break;

    const required = Number(account.required_turnover);
    const completed = Number(account.completed_turnover);
    const need = Math.max(0, required - completed);
    if (need <= 0) {
      await connection.query(
        `UPDATE user_bonus_accounts
         SET status = 'completed', progress = 100, updated_at = NOW()
         WHERE id = ?`,
        [account.id],
      );
      continue;
    }

    const applied = Math.min(remaining, need);
    const newCompleted = completed + applied;
    const progress = computeProgress(newCompleted, required);
    const remainingTurnover = Number(Math.max(0, required - newCompleted).toFixed(2));

    await connection.query(
      `UPDATE user_bonus_accounts
       SET completed_turnover = ?, remaining_turnover = ?, progress = ?, updated_at = NOW()
       WHERE id = ?`,
      [newCompleted, remainingTurnover, progress, account.id],
    );

    if (newCompleted >= required) {
      const [[freshAccount]] = await connection.query(
        `SELECT * FROM user_bonus_accounts WHERE id = ? LIMIT 1`,
        [account.id],
      );
      await connection.query(
        `UPDATE user_bonus_accounts
         SET status = 'completed', progress = 100, remaining_turnover = 0
         WHERE id = ?`,
        [account.id],
      );
      if (freshAccount) {
        await releaseLockedDepositBonus(connection, userId, freshAccount);
        await connection.query(
          `UPDATE transactions
           SET status = 'approved', method = ?
           WHERE user_id = ? AND type = 'bonus' AND method = ? AND status = 'pending'`,
          [
            `deposit_bonus:${freshAccount.rule_id}:${freshAccount.deposit_transaction_id}`,
            userId,
            `deposit_bonus_pending:${freshAccount.rule_id}:${freshAccount.deposit_transaction_id}`,
          ],
        );
        await connection.query(
          `UPDATE bonus_records br
           INNER JOIN transactions t ON t.id = br.transaction_id
           SET br.status = 'approved', br.title = REPLACE(br.title, ' (locked)', '')
           WHERE t.user_id = ? AND t.method = ? AND t.status = 'approved'`,
          [
            userId,
            `deposit_bonus:${freshAccount.rule_id}:${freshAccount.deposit_transaction_id}`,
          ],
        );
      }
    }

    remaining -= applied;
  }
}

export async function hasLockedDepositBonus(userId, connection = null) {
  void userId;
  void connection;
  return false;
}

export async function getUserDepositBonusStatus(userId) {
  const pool = getPool();
  await expireStaleBonusAccounts(pool);

  const [accounts] = await pool.query(
    `SELECT a.*, r.title AS rule_title, u.name AS user_name, u.phone AS user_phone
     FROM user_bonus_accounts a
     INNER JOIN deposit_bonus_rules r ON r.id = a.rule_id
     INNER JOIN users u ON u.id = a.user_id
     WHERE a.user_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [userId],
  );

  const activeRules = await listActiveDepositBonusRules();
  const formatted = accounts.map(formatAccountRow);
  const inProgress = formatted.filter((row) => row.status === 'in_progress');
  const bonusBalance = inProgress.reduce((sum, row) => sum + Number(row.bonusAmount || 0), 0);

  return {
    hasLockedBonus: inProgress.length > 0,
    bonusBalance: Number(bonusBalance.toFixed(2)),
    depositBalance: formatted.reduce((sum, row) => {
      if (row.status === 'in_progress') return sum + Number(row.depositAmount || 0);
      return sum;
    }, 0),
    activeRules,
    accounts: formatted,
    inProgressAccounts: inProgress,
    completedAccounts: formatted.filter((row) => row.status === 'completed'),
    primaryProgress: aggregateInProgressAccounts(inProgress),
  };
}

export default {
  migrateDepositBonusSchema,
  getDepositBonusSummary,
  listDepositBonusRules,
  listActiveDepositBonusRules,
  createDepositBonusRule,
  updateDepositBonusRule,
  deleteDepositBonusRule,
  listDepositBonusUserAccounts,
  cancelDepositBonusAccount,
  processDepositBalanceBonus,
  finalizeDepositBalanceBonusNotification,
  applyDepositBonusTurnover,
  hasLockedDepositBonus,
  getUserDepositBonusStatus,
  expireStaleBonusAccounts,
  invalidateActiveRulesCache,
};
