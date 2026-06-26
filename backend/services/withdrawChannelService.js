import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const WITHDRAW_CHANNEL = {
  AGENT: 'AGENT',
  PAYMENT: 'PAYMENT',
};

export const WITHDRAW_CHANNEL_MESSAGES = {
  NO_DEPOSIT: 'প্রথমে একটি Successful Deposit করুন।',
  AGENT_ONLY:
    'আপনি Agent এর মাধ্যমে Deposit করেছেন, তাই শুধুমাত্র Agent এর মাধ্যমেই Withdraw করতে পারবেন।',
  PAYMENT_ONLY:
    'আপনি Payment Gateway এর মাধ্যমে Deposit করেছেন, তাই শুধুমাত্র Payment Gateway এর মাধ্যমেই Withdraw করতে পারবেন।',
};

function normalizeChannel(value) {
  const channel = String(value ?? '').trim().toUpperCase();
  if (channel === WITHDRAW_CHANNEL.AGENT) return WITHDRAW_CHANNEL.AGENT;
  if (channel === WITHDRAW_CHANNEL.PAYMENT) return WITHDRAW_CHANNEL.PAYMENT;
  return null;
}

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function migrateWithdrawChannelSchema() {
  const pool = getPool();

  try {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN withdraw_channel ENUM('AGENT', 'PAYMENT') NULL DEFAULT NULL AFTER withdraw_blocked`,
    );
  } catch {
    // column may exist
  }

  const schemaPath = path.join(__dirname, '..', 'sql', 'withdraw_channel.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    for (const statement of splitSqlStatements(schema)) {
      await pool.query(statement);
    }
  }
}

export async function getUserWithdrawChannel(userId, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT withdraw_channel FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return normalizeChannel(row?.withdraw_channel);
}

async function insertWithdrawChannelLog(connection, {
  userId,
  oldChannel,
  newChannel,
  depositType = null,
  depositId = null,
  changeSource = 'first_deposit',
  changedBy = null,
}) {
  await connection.query(
    `INSERT INTO withdraw_channel_logs
       (user_id, old_channel, new_channel, deposit_type, deposit_id, change_source, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      oldChannel,
      newChannel,
      depositType,
      depositId,
      changeSource,
      changedBy,
    ],
  );
}

export function resolveDepositChannelFromTransaction(transaction = {}) {
  const method = String(transaction.method || '').trim().toLowerCase();
  if (method === 'agent') {
    return WITHDRAW_CHANNEL.AGENT;
  }
  return WITHDRAW_CHANNEL.PAYMENT;
}

export async function setWithdrawChannelOnFirstDeposit(
  connection,
  { userId, depositType, depositId = null },
) {
  const normalizedType = normalizeChannel(depositType);
  if (!normalizedType) {
    return { changed: false, channel: null };
  }

  const [[user]] = await connection.query(
    `SELECT id, withdraw_channel FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  if (!user) {
    return { changed: false, channel: null };
  }

  const currentChannel = normalizeChannel(user.withdraw_channel);
  if (currentChannel) {
    return { changed: false, channel: currentChannel };
  }

  const [result] = await connection.query(
    `UPDATE users
     SET withdraw_channel = ?
     WHERE id = ? AND withdraw_channel IS NULL`,
    [normalizedType, userId],
  );

  if (!result.affectedRows) {
    const channel = await getUserWithdrawChannel(userId, connection);
    return { changed: false, channel };
  }

  await insertWithdrawChannelLog(connection, {
    userId,
    oldChannel: null,
    newChannel: normalizedType,
    depositType: normalizedType,
    depositId,
    changeSource: 'first_deposit',
    changedBy: null,
  });

  return { changed: true, channel: normalizedType };
}

export async function assertWithdrawChannelForAgent(connection, userId) {
  const channel = await getUserWithdrawChannel(userId, connection);

  if (!channel) {
    const error = new Error(WITHDRAW_CHANNEL_MESSAGES.NO_DEPOSIT);
    error.statusCode = 403;
    error.code = 'WITHDRAW_CHANNEL_NOT_SET';
    throw error;
  }

  if (channel !== WITHDRAW_CHANNEL.AGENT) {
    const error = new Error(WITHDRAW_CHANNEL_MESSAGES.PAYMENT_ONLY);
    error.statusCode = 403;
    error.code = 'WITHDRAW_CHANNEL_PAYMENT_LOCKED';
    throw error;
  }

  return channel;
}

export async function assertWithdrawChannelForPayment(connection, userId) {
  const channel = await getUserWithdrawChannel(userId, connection);

  if (!channel) {
    const error = new Error(WITHDRAW_CHANNEL_MESSAGES.NO_DEPOSIT);
    error.statusCode = 403;
    error.code = 'WITHDRAW_CHANNEL_NOT_SET';
    throw error;
  }

  if (channel !== WITHDRAW_CHANNEL.PAYMENT) {
    const error = new Error(WITHDRAW_CHANNEL_MESSAGES.AGENT_ONLY);
    error.statusCode = 403;
    error.code = 'WITHDRAW_CHANNEL_AGENT_LOCKED';
    throw error;
  }

  return channel;
}

export async function adminUpdateWithdrawChannel(connection, {
  userId,
  newChannel,
  adminId,
}) {
  const normalizedNew = normalizeChannel(newChannel);
  if (!normalizedNew) {
    const error = new Error('Withdraw channel must be AGENT or PAYMENT');
    error.statusCode = 400;
    throw error;
  }

  const [[user]] = await connection.query(
    `SELECT id, withdraw_channel FROM users WHERE id = ? AND role = 'user' FOR UPDATE`,
    [userId],
  );

  if (!user) {
    const error = new Error('Player not found');
    error.statusCode = 404;
    throw error;
  }

  const oldChannel = normalizeChannel(user.withdraw_channel);
  if (oldChannel === normalizedNew) {
    return { changed: false, channel: normalizedNew, oldChannel };
  }

  await connection.query(`UPDATE users SET withdraw_channel = ? WHERE id = ?`, [
    normalizedNew,
    userId,
  ]);

  await insertWithdrawChannelLog(connection, {
    userId,
    oldChannel,
    newChannel: normalizedNew,
    depositType: null,
    depositId: null,
    changeSource: 'admin_manual',
    changedBy: adminId,
  });

  return { changed: true, channel: normalizedNew, oldChannel };
}

export async function listWithdrawChannelLogs(userId, limit = 50) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, user_id AS userId, old_channel AS oldChannel, new_channel AS newChannel,
            deposit_type AS depositType, deposit_id AS depositId,
            change_source AS changeSource, changed_by AS changedBy, created_at AS createdAt
     FROM withdraw_channel_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, Math.min(100, Math.max(1, Number(limit) || 50))],
  );

  return rows;
}

export default {
  WITHDRAW_CHANNEL,
  WITHDRAW_CHANNEL_MESSAGES,
  migrateWithdrawChannelSchema,
  getUserWithdrawChannel,
  setWithdrawChannelOnFirstDeposit,
  resolveDepositChannelFromTransaction,
  assertWithdrawChannelForAgent,
  assertWithdrawChannelForPayment,
  adminUpdateWithdrawChannel,
  listWithdrawChannelLogs,
};
