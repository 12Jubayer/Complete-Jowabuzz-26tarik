import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta } from './gameWalletService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_LEVELS = [
  { level: 0, expRequired: 0, levelUpReward: 0, monthlyReward: 0, safePercent: 0 },
  { level: 1, expRequired: 3000, levelUpReward: 60, monthlyReward: 30, safePercent: 0.2 },
  { level: 2, expRequired: 30000, levelUpReward: 180, monthlyReward: 90, safePercent: 0.2 },
  { level: 3, expRequired: 500000, levelUpReward: 600, monthlyReward: 280, safePercent: 0.2 },
  { level: 4, expRequired: 5000000, levelUpReward: 1600, monthlyReward: 600, safePercent: 0.3 },
  { level: 5, expRequired: 10000000, levelUpReward: 4000, monthlyReward: 1600, safePercent: 0.3 },
  { level: 6, expRequired: 800000000, levelUpReward: 16000, monthlyReward: 4000, safePercent: 0.3 },
  { level: 7, expRequired: 2000000000, levelUpReward: 40000, monthlyReward: 10000, safePercent: 0.4 },
  { level: 8, expRequired: 5000000000, levelUpReward: 100000, monthlyReward: 25000, safePercent: 0.4 },
  { level: 9, expRequired: 10000000000, levelUpReward: 250000, monthlyReward: 60000, safePercent: 0.5 },
];

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function formatVipLevelRow(row) {
  return {
    id: row.id,
    level: Number(row.level),
    expRequired: Number(row.exp_required),
    levelUpReward: Number(row.level_up_reward),
    monthlyReward: Number(row.monthly_reward),
    safePercent: Number(row.safe_percent),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLevelInput(input) {
  const level = Number(input.level ?? input.levelNumber ?? input.level_number);
  const expRequired = Number(input.expRequired ?? input.exp_required ?? 0);
  const levelUpReward = Number(input.levelUpReward ?? input.level_up_reward ?? 0);
  const monthlyReward = Number(input.monthlyReward ?? input.monthly_reward ?? 0);
  const safePercent = Number(input.safePercent ?? input.safe_percent ?? 0);
  const isActive =
    input.isActive !== false &&
    input.is_active !== false &&
    input.isActive !== 0 &&
    input.is_active !== 0;

  if (!Number.isInteger(level) || level < 0) {
    const error = new Error('Level must be a non-negative integer');
    error.statusCode = 400;
    throw error;
  }

  if (expRequired < 0 || levelUpReward < 0 || monthlyReward < 0 || safePercent < 0) {
    const error = new Error('VIP level values cannot be negative');
    error.statusCode = 400;
    throw error;
  }

  return { level, expRequired, levelUpReward, monthlyReward, safePercent, isActive };
}

function currentRewardMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function renameLegacyLevelColumn(pool) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM vip_levels`);
  const names = columns.map((column) => column.Field);

  if (names.includes('level_number') && !names.includes('level')) {
    await pool.query(`ALTER TABLE vip_levels CHANGE COLUMN level_number level INT NOT NULL`);
  }
}

export async function migrateVipLevelsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'vip_levels.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await renameLegacyLevelColumn(pool);

  try {
    await pool.query(`ALTER TABLE vip_levels DROP COLUMN rebate_percent`);
  } catch (error) {
    if (error.code !== 'ER_BAD_FIELD_ERROR' && error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
      throw error;
    }
  }

  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM vip_levels`);
  if (Number(count) === 0) {
    for (const level of DEFAULT_LEVELS) {
      await pool.query(
        `INSERT INTO vip_levels
         (level, exp_required, level_up_reward, monthly_reward, safe_percent, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          level.level,
          level.expRequired,
          level.levelUpReward,
          level.monthlyReward,
          level.safePercent,
        ],
      );
    }
  }
}

export async function listAllVipLevels({ activeOnly = false } = {}) {
  const pool = getPool();
  let sql = `SELECT id, level, exp_required, level_up_reward, monthly_reward, safe_percent, is_active, created_at, updated_at
             FROM vip_levels`;
  if (activeOnly) {
    sql += ` WHERE is_active = 1`;
  }
  sql += ` ORDER BY level ASC`;

  const [rows] = await pool.query(sql);
  return rows.map(formatVipLevelRow);
}

export async function getVipLevelById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT id, level, exp_required, level_up_reward, monthly_reward, safe_percent, is_active, created_at, updated_at
     FROM vip_levels WHERE id = ? LIMIT 1`,
    [id],
  );
  return row ? formatVipLevelRow(row) : null;
}

export async function getVipLevelByNumber(levelNumber, connection = null) {
  const pool = connection || getPool();
  const [[row]] = await pool.query(
    `SELECT id, level, exp_required, level_up_reward, monthly_reward, safe_percent, is_active
     FROM vip_levels WHERE level = ? LIMIT 1`,
    [levelNumber],
  );
  return row ? formatVipLevelRow(row) : null;
}

export async function createVipLevel(input) {
  const pool = getPool();
  const payload = normalizeLevelInput(input);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO vip_levels
       (level, exp_required, level_up_reward, monthly_reward, safe_percent, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.level,
        payload.expRequired,
        payload.levelUpReward,
        payload.monthlyReward,
        payload.safePercent,
        payload.isActive ? 1 : 0,
      ],
    );
    await connection.commit();
    return getVipLevelById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateVipLevel(id, input) {
  const pool = getPool();
  const existing = await getVipLevelById(id);
  if (!existing) {
    const error = new Error('VIP level not found');
    error.statusCode = 404;
    throw error;
  }

  const payload = normalizeLevelInput({ ...existing, ...input });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE vip_levels
       SET level = ?, exp_required = ?, level_up_reward = ?, monthly_reward = ?, safe_percent = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.level,
        payload.expRequired,
        payload.levelUpReward,
        payload.monthlyReward,
        payload.safePercent,
        payload.isActive ? 1 : 0,
        id,
      ],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getVipLevelById(id);
}

export async function bulkUpdateVipLevels(levels) {
  if (!Array.isArray(levels) || levels.length === 0) {
    const error = new Error('At least one VIP level is required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const level of levels) {
      const id = Number(level.id);
      if (!id) {
        const error = new Error('Each VIP level must include an id');
        error.statusCode = 400;
        throw error;
      }
      const payload = normalizeLevelInput(level);
      await connection.query(
        `UPDATE vip_levels
         SET level = ?, exp_required = ?, level_up_reward = ?, monthly_reward = ?, safe_percent = ?, is_active = ?
         WHERE id = ?`,
        [
          payload.level,
          payload.expRequired,
          payload.levelUpReward,
          payload.monthlyReward,
          payload.safePercent,
          payload.isActive ? 1 : 0,
          id,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return listAllVipLevels();
}

export async function deleteVipLevel(id) {
  const pool = getPool();
  const existing = await getVipLevelById(id);
  if (!existing) {
    const error = new Error('VIP level not found');
    error.statusCode = 404;
    throw error;
  }

  await pool.query(`DELETE FROM vip_levels WHERE id = ?`, [id]);
  return { success: true };
}

export async function calculateVipLevelFromExp(vipExp, connection = null) {
  const pool = connection || getPool();
  const [rows] = await pool.query(
    `SELECT level, exp_required
     FROM vip_levels
     WHERE is_active = 1
     ORDER BY level ASC`,
  );

  let level = 0;
  for (const row of rows) {
    if (Number(vipExp) >= Number(row.exp_required)) {
      level = Number(row.level);
    } else {
      break;
    }
  }

  return level;
}

export async function getVipProgress(vipLevel, vipExp) {
  const levels = await listAllVipLevels({ activeOnly: true });
  const current =
    levels.find((row) => row.level === Number(vipLevel)) ||
    levels.find((row) => row.level === 0) ||
    levels[0];
  const next = levels.find((row) => row.level === Number(vipLevel) + 1);

  const currentExp = Number(current?.expRequired ?? 0);
  const nextExp = next ? Number(next.expRequired) : null;

  let progressPercent = 100;
  if (nextExp !== null && nextExp > currentExp) {
    progressPercent = Math.min(
      100,
      Math.max(0, ((Number(vipExp) - currentExp) / (nextExp - currentExp)) * 100),
    );
  }

  return {
    currentLevel: current || null,
    nextLevel: next || null,
    nextVipExp: nextExp,
    currentVipExp: currentExp,
    vipLabel: `VIP ${current?.level ?? 0}`,
    progressPercent,
    safePercent: current?.safePercent ?? 0,
    levelUpReward: current?.levelUpReward ?? 0,
    monthlyReward: current?.monthlyReward ?? 0,
  };
}

async function creditVipReward(connection, userId, { amount, rewardType, vipLevel, rewardMonth, title, method }) {
  const rewardAmount = Number(amount);
  if (!rewardAmount || rewardAmount <= 0) return null;

  await applyBalanceDelta(connection, userId, rewardAmount);

  const [txResult] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, rewardAmount, method],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, title, rewardAmount, txResult.insertId],
  );

  await connection.query(
    `INSERT INTO vip_reward_logs (user_id, reward_type, vip_level, amount, reward_month, transaction_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, rewardType, vipLevel ?? null, rewardAmount, rewardMonth ?? null, txResult.insertId],
  );

  return txResult.insertId;
}

async function grantLevelUpRewards(connection, userId, previousLevel, newLevel) {
  if (newLevel <= previousLevel) return [];

  const granted = [];
  for (let level = previousLevel + 1; level <= newLevel; level += 1) {
    const [[existing]] = await connection.query(
      `SELECT id FROM vip_reward_logs
       WHERE user_id = ? AND reward_type = 'level_up' AND vip_level = ?
       LIMIT 1`,
      [userId, level],
    );
    if (existing) continue;

    const config = await getVipLevelByNumber(level, connection);
    if (!config || !config.isActive || !config.levelUpReward) continue;

    await creditVipReward(connection, userId, {
      amount: config.levelUpReward,
      rewardType: 'level_up',
      vipLevel: level,
      title: `VIP ${level} Level-up Reward`,
      method: `vip:level_up:${level}`,
    });
    granted.push(level);
  }

  return granted;
}

async function grantMonthlyReward(connection, userId, vipLevel) {
  if (vipLevel <= 0) return null;

  const config = await getVipLevelByNumber(vipLevel, connection);
  if (!config || !config.isActive || !config.monthlyReward) return null;

  const rewardMonth = currentRewardMonth();
  const [[existing]] = await connection.query(
    `SELECT id FROM vip_reward_logs
     WHERE user_id = ? AND reward_type = 'monthly' AND reward_month = ?
     LIMIT 1`,
    [userId, rewardMonth],
  );
  if (existing) return null;

  await creditVipReward(connection, userId, {
    amount: config.monthlyReward,
    rewardType: 'monthly',
    vipLevel,
    rewardMonth,
    title: `VIP ${vipLevel} Monthly Reward (${rewardMonth})`,
    method: `vip:monthly:${rewardMonth}`,
  });

  return rewardMonth;
}

export async function applySafeCashback(connection, userId, lossAmount) {
  const loss = Math.abs(Number(lossAmount));
  if (!loss) return 0;

  const [[wallet]] = await connection.query(
    `SELECT vip_level FROM user_wallets WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (!wallet) return 0;

  const config = await getVipLevelByNumber(wallet.vip_level, connection);
  if (!config || !config.isActive || !config.safePercent) return 0;

  const cashback = Number(((loss * config.safePercent) / 100).toFixed(2));
  if (!cashback) return 0;

  await creditVipReward(connection, userId, {
    amount: cashback,
    rewardType: 'safe_cashback',
    vipLevel: config.level,
    title: `VIP ${config.level} Safe Cashback`,
    method: `vip:safe_cashback`,
  });

  return cashback;
}

export async function processUserVipProgress(userId, connection = null, options = {}) {
  const pool = connection || getPool();
  const ownsConnection = !connection;
  const db = connection || (await pool.getConnection());
  const betAmount = Math.max(0, Math.floor(Number(options?.betAmount || 0)));

  try {
    if (ownsConnection) await db.beginTransaction();

    const [[wallet]] = await db.query(
      `SELECT vip_level, vip_exp
       FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [userId],
    );
    if (!wallet) {
      if (ownsConnection) await db.commit();
      return null;
    }

    const previousLevel = Number(wallet.vip_level || 0);
    const storedExp = Math.floor(Number(wallet.vip_exp || 0));
    const vipExp = betAmount > 0 ? storedExp + betAmount : storedExp;
    const calculatedLevel = await calculateVipLevelFromExp(vipExp, db);
    const nextLevel = Math.max(previousLevel, calculatedLevel);

    await db.query(
      `UPDATE user_wallets SET vip_exp = ?, vip_level = ? WHERE user_id = ?`,
      [vipExp, nextLevel, userId],
    );

    const levelUps = await grantLevelUpRewards(db, userId, previousLevel, calculatedLevel);
    const monthlyReward = await grantMonthlyReward(db, userId, calculatedLevel);

    if (ownsConnection) await db.commit();

    return {
      vipExp,
      vipLevel: calculatedLevel,
      levelUps,
      monthlyReward,
    };
  } catch (error) {
    if (ownsConnection) await db.rollback();
    throw error;
  } finally {
    if (ownsConnection) db.release();
  }
}

export async function syncUserVipLevel(userId, connection = null) {
  const result = await processUserVipProgress(userId, connection);
  return result?.vipLevel ?? null;
}

export default migrateVipLevelsSchema;
