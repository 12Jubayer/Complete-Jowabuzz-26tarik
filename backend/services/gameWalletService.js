import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { cancelTurnoverOnLowBalance } from './turnoverLowBalanceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PROVIDERS = [
  { code: 'JILI', name: 'JILI', adapter_key: 'demo' },
  { code: 'PG', name: 'PG Soft', adapter_key: 'demo' },
  { code: 'PP', name: 'Pragmatic Play', adapter_key: 'demo' },
  { code: 'SPRIBE', name: 'Spribe', adapter_key: 'demo' },
  { code: 'Evolution', name: 'Evolution', adapter_key: 'demo' },
  { code: 'Sexy', name: 'Sexy Gaming', adapter_key: 'demo' },
  { code: 'SmartSoft', name: 'SmartSoft', adapter_key: 'demo' },
];

const DEFAULT_GAMES = [];

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function migrateGameWalletSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'game_wallet_tables.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  try {
    await pool.query(
      `ALTER TABLE transactions
       MODIFY COLUMN type ENUM('deposit', 'withdraw', 'bonus', 'adjustment', 'bet', 'win')
       NOT NULL`,
    );
  } catch {
    // enum may already include bet/win
  }

  for (const provider of DEFAULT_PROVIDERS) {
    await pool.query(
      `INSERT IGNORE INTO providers (code, name, adapter_key, status)
       VALUES (?, ?, ?, 'active')`,
      [provider.code, provider.name, provider.adapter_key],
    );
  }

  const [providerRows] = await pool.query(`SELECT id, code FROM providers`);
  const providerMap = new Map(providerRows.map((row) => [row.code, row.id]));

  for (const game of DEFAULT_GAMES) {
    const providerId = providerMap.get(game.provider);
    if (!providerId) continue;

    await pool.query(
      `INSERT IGNORE INTO games (provider_id, code, name, category, image_url, min_bet, status)
       VALUES (?, ?, ?, ?, ?, 10.00, 'active')`,
      [providerId, game.code, game.name, game.category, game.image],
    );
  }

  await pool.query(
    `INSERT INTO wallets (user_id, balance, currency)
     SELECT u.id, u.balance, 'BDT'
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE w.user_id IS NULL`,
  );

  await pool.query(
    `UPDATE wallets w
     INNER JOIN users u ON u.id = w.user_id
     SET w.balance = u.balance
     WHERE w.balance <> u.balance`,
  );
}

export async function ensureWallet(userId, connection = null) {
  const pool = connection || getPool();
  await pool.query(
    `INSERT IGNORE INTO wallets (user_id, balance, currency)
     SELECT id, balance, 'BDT' FROM users WHERE id = ?`,
    [userId],
  );
}

export async function syncAllWalletBalances(userId, connection = null) {
  const pool = connection || getPool();
  const [[user]] = await pool.query(`SELECT balance FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!user) return null;

  const balance = Number(user.balance);
  await ensureWallet(userId, pool);

  await pool.query(`UPDATE wallets SET balance = ? WHERE user_id = ?`, [balance, userId]);

  await pool.query(
    `INSERT IGNORE INTO user_wallets (user_id, balance, required_turnover, completed_turnover)
     SELECT id, balance, 0, 0 FROM users WHERE id = ?`,
    [userId],
  );

  await pool.query(`UPDATE user_wallets SET balance = ? WHERE user_id = ?`, [balance, userId]);

  return balance;
}

export function normalizeLaunchBalance(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100) / 100;
}

export async function getAuthoritativeWalletBalance(userId, connection = null) {
  const pool = connection || getPool();

  if (connection) {
    const [[user]] = await connection.query(
      `SELECT balance FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (!user) return 0;
    return normalizeLaunchBalance(user.balance);
  }

  await syncAllWalletBalances(userId, pool);
  const wallet = await getWalletBalance(userId, pool);
  return normalizeLaunchBalance(wallet?.balance ?? 0);
}

export async function getWalletBalance(userId, connection = null) {
  const pool = connection || getPool();
  await ensureWallet(userId, pool);

  const [[row]] = await pool.query(
    `SELECT u.balance, w.balance AS walletBalance, w.currency
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );

  if (!row) return null;

  return {
    balance: Number(row.balance),
    walletBalance: Number(row.walletBalance ?? row.balance),
    currency: row.currency || 'BDT',
  };
}

export async function applyBalanceDelta(connection, userId, delta) {
  const amount = Number(delta);
  if (!Number.isFinite(amount) || amount === 0) {
    const balance = await getWalletBalance(userId, connection);
    return balance.balance;
  }

  const [[user]] = await connection.query(
    `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const nextBalance = Number(user.balance) + amount;

  if (nextBalance < 0) {
    const error = new Error('Insufficient balance');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(`UPDATE users SET balance = ? WHERE id = ?`, [nextBalance, userId]);
  await ensureWallet(userId, connection);
  await connection.query(`UPDATE wallets SET balance = ? WHERE user_id = ?`, [nextBalance, userId]);
  await connection.query(
    `UPDATE user_wallets SET balance = ? WHERE user_id = ?`,
    [nextBalance, userId],
  );

  await cancelTurnoverOnLowBalance(userId, nextBalance, connection);

  return nextBalance;
}

export async function logApiEvent(connection, payload) {
  await connection.query(
    `INSERT INTO api_logs (user_id, provider_id, endpoint, method, request_payload, response_payload, status_code)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.userId || null,
      payload.providerId || null,
      payload.endpoint,
      payload.method,
      JSON.stringify(payload.requestPayload || null),
      JSON.stringify(payload.responsePayload || null),
      payload.statusCode || null,
    ],
  );
}

export default {
  migrateGameWalletSchema,
  ensureWallet,
  syncAllWalletBalances,
  normalizeLaunchBalance,
  getAuthoritativeWalletBalance,
  getWalletBalance,
  applyBalanceDelta,
  logApiEvent,
};
