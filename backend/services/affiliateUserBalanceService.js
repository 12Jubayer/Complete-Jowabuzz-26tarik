import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { ensureUserWallet, syncWalletBalance } from './userWalletService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC_MARKER_FILE = path.join(__dirname, '..', '.affiliate_settled_balance_sync_v1');
const ZERO_TURNOVER_MARKER_FILE = path.join(__dirname, '..', '.affiliate_zero_turnover_sync_v1');

export async function getAffiliateUserId(affiliateId, connection = null) {
  const pool = connection || getPool();
  const [[row]] = await pool.query(
    `SELECT user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );
  return row?.user_id ? Number(row.user_id) : null;
}

export async function ensureAffiliateZeroTurnover(userId, connection = null) {
  const pool = connection || getPool();
  if (!userId) return false;

  await ensureUserWallet(userId, pool);
  await pool.query(
    `UPDATE user_wallets
     SET required_turnover = 0, completed_turnover = 0
     WHERE user_id = ?`,
    [userId],
  );
  return true;
}

export async function syncAllAffiliateUsersZeroTurnover() {
  if (fs.existsSync(ZERO_TURNOVER_MARKER_FILE)) {
    return { skipped: true };
  }

  const pool = getPool();
  const [rows] = await pool.query(`SELECT user_id FROM affiliate_profiles`);

  for (const row of rows) {
    await ensureAffiliateZeroTurnover(row.user_id);
  }

  fs.writeFileSync(ZERO_TURNOVER_MARKER_FILE, new Date().toISOString(), 'utf8');
  return { synced: rows.length };
}

export async function creditAffiliateUserBalance(userId, amount, connection = null) {
  const pool = connection || getPool();
  const creditAmount = Number(amount);

  if (!userId || !creditAmount || creditAmount <= 0) {
    return { credited: false, balanceBefore: 0, balanceAfter: 0 };
  }

  await ensureUserWallet(userId, pool);
  await ensureAffiliateZeroTurnover(userId, pool);

  const [[user]] = await pool.query(
    `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  const balanceBefore = Number(user?.balance || 0);
  const balanceAfter = Number((balanceBefore + creditAmount).toFixed(2));

  await pool.query(`UPDATE users SET balance = ? WHERE id = ?`, [balanceAfter, userId]);
  await syncWalletBalance(userId, pool);

  return { credited: true, balanceBefore, balanceAfter };
}

export async function debitAffiliateUserBalance(userId, amount, connection = null) {
  const pool = connection || getPool();
  const debitAmount = Number(amount);

  if (!userId || !debitAmount || debitAmount <= 0) {
    return false;
  }

  const [[user]] = await pool.query(`SELECT balance FROM users WHERE id = ? FOR UPDATE`, [userId]);
  if (!user || Number(user.balance) < debitAmount) {
    const error = new Error('Insufficient affiliate balance');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(`UPDATE users SET balance = balance - ? WHERE id = ?`, [debitAmount, userId]);
  await syncWalletBalance(userId, pool);
  return true;
}

export async function findPlayerByUserIdentifier(identifier, connection = null) {
  const pool = connection || getPool();
  const raw = String(identifier || '').trim();

  if (!raw) {
    return null;
  }

  const numericId = Number(raw);
  const [rows] = await pool.query(
    `SELECT id, name, phone, provider_username, balance, status
     FROM users
     WHERE role = 'user'
       AND status = 'active'
       AND (
         provider_username = ?
         OR CAST(id AS CHAR) = ?
         ${Number.isFinite(numericId) && numericId > 0 ? 'OR id = ?' : ''}
       )
     LIMIT 1`,
    Number.isFinite(numericId) && numericId > 0 ? [raw, raw, numericId] : [raw, raw],
  );

  return rows[0] || null;
}

export async function syncExistingSettledCommissionToUserBalance() {
  if (fs.existsSync(SYNC_MARKER_FILE)) {
    return { skipped: true };
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ap.id, ap.user_id, ap.settled_commission
     FROM affiliate_profiles ap
     WHERE ap.settled_commission > 0`,
  );

  for (const row of rows) {
    await creditAffiliateUserBalance(row.user_id, row.settled_commission);
  }

  fs.writeFileSync(SYNC_MARKER_FILE, new Date().toISOString(), 'utf8');
  return { synced: rows.length };
}
