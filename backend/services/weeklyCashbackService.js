import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { applyBalanceDelta } from './gameWalletService.js';
import { notifyWeeklyCashback } from './notificationService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function mapSettingsRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    cashbackPercent: Number(row.cashback_percent),
    minNetLoss: Number(row.min_net_loss),
    dayOfWeek: Number(row.day_of_week),
    hourUtc: Number(row.hour_utc),
    lastRunAt: row.last_run_at,
    lastRunCredited: Number(row.last_run_credited || 0),
    lastRunSkipped: Number(row.last_run_skipped || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayoutRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || row.user_phone || row.user_email || `User #${row.user_id}`,
    userPhone: row.user_phone || null,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    totalBet: Number(row.total_bet),
    totalWin: Number(row.total_win),
    netLoss: Number(row.net_loss),
    cashbackPercent: Number(row.cashback_percent),
    cashbackAmount: Number(row.cashback_amount),
    status: row.status,
    createdAt: row.created_at,
  };
}

function clampDayOfWeek(value) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    const error = new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    error.statusCode = 400;
    throw error;
  }
  return day;
}

function clampHourUtc(value) {
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    const error = new Error('Hour must be between 0 and 23');
    error.statusCode = 400;
    throw error;
  }
  return hour;
}

function clampPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    const error = new Error('Cashback percent must be between 0 and 100');
    error.statusCode = 400;
    throw error;
  }
  return Number(percent.toFixed(2));
}

function clampMinNetLoss(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    const error = new Error('Minimum net loss must be 0 or greater');
    error.statusCode = 400;
    throw error;
  }
  return Number(amount.toFixed(2));
}

export function getCompletedWeekRange(dayOfWeek, hourUtc, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  const safeDay = clampDayOfWeek(dayOfWeek);
  const safeHour = clampHourUtc(hourUtc);

  const boundaryToday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    safeHour,
    0,
    0,
    0,
  ));

  const daysSinceBoundary = (now.getUTCDay() - safeDay + 7) % 7;
  const weekEnd = new Date(boundaryToday);
  weekEnd.setUTCDate(weekEnd.getUTCDate() - daysSinceBoundary);

  if (daysSinceBoundary === 0 && now < boundaryToday) {
    weekEnd.setUTCDate(weekEnd.getUTCDate() - 7);
  }

  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);

  return {
    weekStart,
    weekEnd,
    weekStartLabel: weekStart.toISOString().slice(0, 10),
    weekEndLabel: weekEnd.toISOString().slice(0, 10),
  };
}

async function ensureDefaultSettings(connection = null) {
  const pool = connection || getPool();
  const db = connection || pool;

  const [[existing]] = await db.query(
    `SELECT id FROM weekly_cashback_settings ORDER BY id ASC LIMIT 1`,
  );

  if (!existing) {
    await db.query(
      `INSERT INTO weekly_cashback_settings
        (enabled, cashback_percent, min_net_loss, day_of_week, hour_utc)
       VALUES (1, 2, 0, 3, 3)`,
    );
  }
}

export async function migrateWeeklyCashbackSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'weekly_cashback.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await ensureDefaultSettings();
}

export async function getWeeklyCashbackSettings() {
  const pool = getPool();
  await ensureDefaultSettings();

  const [[row]] = await pool.query(
    `SELECT * FROM weekly_cashback_settings ORDER BY id ASC LIMIT 1`,
  );

  return mapSettingsRow(row);
}

export async function updateWeeklyCashbackSettings(payload = {}) {
  const pool = getPool();
  await ensureDefaultSettings();

  const settings = await getWeeklyCashbackSettings();
  const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : settings.enabled;
  const cashbackPercent = payload.cashbackPercent !== undefined
    ? clampPercent(payload.cashbackPercent)
    : settings.cashbackPercent;
  const minNetLoss = payload.minNetLoss !== undefined
    ? clampMinNetLoss(payload.minNetLoss)
    : settings.minNetLoss;
  const dayOfWeek = payload.dayOfWeek !== undefined
    ? clampDayOfWeek(payload.dayOfWeek)
    : settings.dayOfWeek;
  const hourUtc = payload.hourUtc !== undefined
    ? clampHourUtc(payload.hourUtc)
    : settings.hourUtc;

  await pool.query(
    `UPDATE weekly_cashback_settings
     SET enabled = ?, cashback_percent = ?, min_net_loss = ?, day_of_week = ?, hour_utc = ?
     WHERE id = ?`,
    [
      enabled ? 1 : 0,
      cashbackPercent,
      minNetLoss,
      dayOfWeek,
      hourUtc,
      settings.id,
    ],
  );

  return getWeeklyCashbackSettings();
}

export async function listWeeklyCashbackPayouts({ limit = 50 } = {}) {
  const pool = getPool();
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  const [rows] = await pool.query(
    `SELECT
       p.*,
       u.name AS user_name,
       u.phone AS user_phone,
       u.email AS user_email
     FROM weekly_cashback_payouts p
     INNER JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [safeLimit],
  );

  return rows.map(mapPayoutRow);
}

async function creditWeeklyCashback(connection, userId, {
  amount,
  weekStart,
  weekEnd,
  cashbackPercent,
  totalBet,
  totalWin,
  netLoss,
}) {
  const cashbackAmount = Number(amount);
  if (!cashbackAmount || cashbackAmount <= 0) return null;

  await applyBalanceDelta(connection, userId, cashbackAmount);

  const title = `Weekly Cashback (${weekStart.toISOString().slice(0, 10)} — ${weekEnd.toISOString().slice(0, 10)})`;
  const method = `weekly_cashback:${weekStart.toISOString()}:${weekEnd.toISOString()}`;

  const [txResult] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, cashbackAmount, method],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, title, cashbackAmount, txResult.insertId],
  );

  const [payoutResult] = await connection.query(
    `INSERT INTO weekly_cashback_payouts
      (user_id, week_start, week_end, total_bet, total_win, net_loss, cashback_percent, cashback_amount, status, transaction_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'credited', ?)`,
    [
      userId,
      weekStart,
      weekEnd,
      totalBet,
      totalWin,
      netLoss,
      cashbackPercent,
      cashbackAmount,
      txResult.insertId,
    ],
  );

  return {
    payoutId: payoutResult.insertId,
    transactionId: txResult.insertId,
    cashbackAmount,
    title,
  };
}

export function shouldRunWeeklyCashbackNow(settings, referenceDate = new Date()) {
  if (!settings?.enabled) return false;

  const now = new Date(referenceDate);
  if (now.getUTCDay() !== Number(settings.dayOfWeek)) return false;
  if (now.getUTCHours() !== Number(settings.hourUtc)) return false;

  // Run once during the scheduled hour (minute 5, same pattern as other crons).
  return now.getUTCMinutes() === 5;
}

function hasAlreadyProcessedWeek(settings, weekEnd) {
  if (!settings?.lastRunAt) return false;
  return new Date(settings.lastRunAt) >= weekEnd;
}

export async function runScheduledWeeklyCashback(referenceDate = new Date()) {
  const pool = getPool();
  const settings = await getWeeklyCashbackSettings();

  if (!settings.enabled) {
    return {
      alreadyRan: true,
      reason: 'Weekly cashback is disabled',
      credited: 0,
      skipped: 0,
    };
  }

  const { weekStart, weekEnd, weekStartLabel, weekEndLabel } = getCompletedWeekRange(
    settings.dayOfWeek,
    settings.hourUtc,
    referenceDate,
  );

  if (hasAlreadyProcessedWeek(settings, weekEnd)) {
    return {
      alreadyRan: true,
      reason: 'Already processed for this week',
      credited: settings.lastRunCredited,
      skipped: settings.lastRunSkipped,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekStartLabel,
      weekEndLabel,
    };
  }

  const connection = await pool.getConnection();
  let credited = 0;
  let skipped = 0;
  const notifications = [];

  try {
    await connection.beginTransaction();

    const [betRows] = await connection.query(
      `SELECT
         user_id,
         COALESCE(SUM(bet_amount), 0) AS total_bet,
         COALESCE(SUM(win_amount), 0) AS total_win
       FROM bet_records
       WHERE created_at >= ? AND created_at < ? AND status = 'settled'
       GROUP BY user_id`,
      [weekStart, weekEnd],
    );

    for (const row of betRows) {
      const userId = Number(row.user_id);
      const totalBet = Number(row.total_bet);
      const totalWin = Number(row.total_win);
      const netLoss = Number((totalBet - totalWin).toFixed(2));

      if (netLoss < settings.minNetLoss) {
        skipped += 1;
        continue;
      }

      const [[existing]] = await connection.query(
        `SELECT id FROM weekly_cashback_payouts
         WHERE user_id = ? AND week_start = ? AND week_end = ?
         LIMIT 1`,
        [userId, weekStart, weekEnd],
      );

      if (existing) {
        skipped += 1;
        continue;
      }

      const cashbackAmount = Number(((netLoss * settings.cashbackPercent) / 100).toFixed(2));
      if (cashbackAmount <= 0) {
        skipped += 1;
        continue;
      }

      const creditResult = await creditWeeklyCashback(connection, userId, {
        amount: cashbackAmount,
        weekStart,
        weekEnd,
        cashbackPercent: settings.cashbackPercent,
        totalBet,
        totalWin,
        netLoss,
      });

      if (creditResult) {
        credited += 1;
        notifications.push({
          userId,
          amount: creditResult.cashbackAmount,
          title: creditResult.title,
        });
      } else {
        skipped += 1;
      }
    }

    await connection.query(
      `UPDATE weekly_cashback_settings
       SET last_run_at = NOW(), last_run_credited = ?, last_run_skipped = ?
       WHERE id = ?`,
      [credited, skipped, settings.id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  for (const item of notifications) {
    try {
      await notifyWeeklyCashback(item.userId, item.amount, item.title);
    } catch (error) {
      console.error('Weekly cashback notification error:', error);
    }
  }

  return {
    credited,
    skipped,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekStartLabel,
    weekEndLabel,
  };
}

/** @deprecated Internal alias kept for cron compatibility */
export const runWeeklyCashbackNow = runScheduledWeeklyCashback;

export default {
  migrateWeeklyCashbackSchema,
  getWeeklyCashbackSettings,
  updateWeeklyCashbackSettings,
  listWeeklyCashbackPayouts,
  shouldRunWeeklyCashbackNow,
  runScheduledWeeklyCashback,
  runWeeklyCashbackNow,
  getCompletedWeekRange,
};
