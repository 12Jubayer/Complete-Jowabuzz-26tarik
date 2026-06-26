import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function generateUserUid(prefix = 'UID') {
  let code = prefix;
  while (code.length < 10) {
    code += UID_CHARS[Math.floor(Math.random() * UID_CHARS.length)];
  }
  return code.slice(0, 12);
}

export async function generateUniqueUserUid(pool, connection = null) {
  const db = connection || pool;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const uid = generateUserUid();
    const [[existing]] = await db.query(
      `SELECT id FROM users WHERE user_uid = ? LIMIT 1`,
      [uid],
    );
    if (!existing) return uid;
  }
  return `UID${Date.now().toString(36).toUpperCase()}`;
}

export async function migrateAdminPlayerSchema() {
  const pool = getPool();

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN user_uid VARCHAR(20) NULL AFTER id`);
  } catch {
    // column may exist
  }

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER created_at`);
  } catch {
    // column may exist
  }

  try {
    await pool.query(`ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45) NULL AFTER last_login`);
  } catch {
    // column may exist
  }

  try {
    await pool.query(
      `ALTER TABLE users
       MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'deleted') NOT NULL DEFAULT 'active'`,
    );
  } catch {
    // enum may already include deleted
  }

  try {
    await pool.query(
      `ALTER TABLE users
       ADD COLUMN withdraw_blocked TINYINT(1) NOT NULL DEFAULT 0 AFTER status`,
    );
  } catch {
    // column may exist
  }

  const schemaPath = path.join(__dirname, '..', 'sql', 'admin_player_tables.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    for (const statement of splitSqlStatements(schema)) {
      if (statement.includes('ADD COLUMN IF NOT EXISTS')) continue;
      try {
        await pool.query(statement);
      } catch {
        // table or column may exist
      }
    }
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          admin_id BIGINT NULL,
          user_id BIGINT NULL,
          action VARCHAR(100) NOT NULL,
          details JSON NULL,
          ip_address VARCHAR(45) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_admin_audit_user_id (user_id),
          INDEX idx_admin_audit_admin_id (admin_id),
          INDEX idx_admin_audit_action (action),
          INDEX idx_admin_audit_created_at (created_at)
        )`,
      );
    } catch {
      // ignore
    }
  }

  const [rowsWithoutUid] = await pool.query(
    `SELECT id FROM users WHERE user_uid IS NULL OR user_uid = ''`,
  );

  for (const row of rowsWithoutUid) {
    const uid = await generateUniqueUserUid(pool);
    await pool.query(`UPDATE users SET user_uid = ? WHERE id = ?`, [uid, row.id]);
  }

  try {
    const cleanup = await cleanupSoftDeletedPlayers();
    if (cleanup.removed > 0) {
      console.info('[adminPlayer] removed soft-deleted player rows:', cleanup.removed);
    }
  } catch (error) {
    console.error('Soft-deleted player cleanup failed:', error.message);
  }
}

export async function logAdminAudit(connection, payload) {
  await connection.query(
    `INSERT INTO admin_audit_logs (admin_id, user_id, action, details, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
    [
      payload.adminId || null,
      payload.userId || null,
      payload.action,
      JSON.stringify(payload.details || null),
      payload.ipAddress || null,
    ],
  );
}

export function formatPlayerIdentifier(user) {
  if (user.email) return user.email;
  if (user.phone) return `${user.phone}@phone.jowabuzz.app`;
  return user.user_uid || '';
}

async function safePlayerDeleteQuery(connection, sql, params = []) {
  try {
    const [result] = await connection.query(sql, params);
    return result;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return { affectedRows: 0 };
    }
    throw error;
  }
}

async function deletePlayerChildRecords(connection, userId) {
  const nullifyStatements = [
    [`UPDATE affiliate_profiles SET settlement_user_id = NULL WHERE settlement_user_id = ?`, [userId]],
    [
      `UPDATE affiliate_settlements
       SET settlement_user_id = NULL, credited_user_id = NULL
       WHERE settlement_user_id = ? OR credited_user_id = ?`,
      [userId, userId],
    ],
    [`UPDATE settlement_history SET settlement_user_id = NULL WHERE settlement_user_id = ?`, [userId]],
    [`UPDATE notifications SET target_user_id = NULL WHERE target_user_id = ?`, [userId]],
    [`UPDATE commission_records SET player_id = NULL WHERE player_id = ?`, [userId]],
    [`UPDATE agent_commissions SET player_id = NULL WHERE player_id = ?`, [userId]],
    [`UPDATE agent_transactions SET user_id = NULL WHERE user_id = ?`, [userId]],
    [`UPDATE gaming_transactions SET user_id = NULL WHERE user_id = ?`, [userId]],
    [`UPDATE user_otps SET user_id = NULL WHERE user_id = ?`, [userId]],
    [`UPDATE chat_conversations SET user_id = NULL WHERE user_id = ?`, [userId]],
  ];

  for (const [sql, params] of nullifyStatements) {
    await safePlayerDeleteQuery(connection, sql, params);
  }

  const deleteStatements = [
    [`DELETE FROM admin_audit_logs WHERE user_id = ?`, [userId]],
    [`DELETE FROM api_logs WHERE user_id = ?`, [userId]],
    [`DELETE FROM game_rounds WHERE user_id = ?`, [userId]],
    [`DELETE FROM game_sessions WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_notifications WHERE user_id = ?`, [userId]],
    [
      `DELETE FROM referral_records WHERE referrer_user_id = ? OR referred_user_id = ?`,
      [userId, userId],
    ],
    [`DELETE FROM affiliate_pending_bets WHERE user_id = ?`, [userId]],
    [`DELETE FROM bet_records WHERE user_id = ?`, [userId]],
    [`DELETE FROM bonus_records WHERE user_id = ?`, [userId]],
    [`DELETE FROM bonus_user_progress WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_bonus_claims WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_bonus_accounts WHERE user_id = ?`, [userId]],
    [`DELETE FROM deposit_requests WHERE user_id = ?`, [userId]],
    [`DELETE FROM withdraw_requests WHERE user_id = ?`, [userId]],
    [`DELETE FROM player_agent_withdraw_requests WHERE user_id = ?`, [userId]],
    [`DELETE FROM agent_player_deposits WHERE user_id = ?`, [userId]],
    [`DELETE FROM transactions WHERE user_id = ?`, [userId]],
    [`DELETE FROM turnover_records WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_bank_details WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_update_requests WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_messages WHERE user_id = ?`, [userId]],
    [`DELETE FROM vip_reward_logs WHERE user_id = ?`, [userId]],
    [`DELETE FROM weekly_cashback_payouts WHERE user_id = ?`, [userId]],
    [`DELETE FROM user_wallets WHERE user_id = ?`, [userId]],
    [`DELETE FROM wallets WHERE user_id = ?`, [userId]],
    [`DELETE FROM affiliate_profiles WHERE user_id = ?`, [userId]],
  ];

  for (const [sql, params] of deleteStatements) {
    await safePlayerDeleteQuery(connection, sql, params);
  }
}

export async function findActivePlayerUsernameConflict(connection, name, excludeUserId = null) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) return null;

  const params = [trimmedName, trimmedName];
  let excludeClause = '';
  if (excludeUserId) {
    excludeClause = ' AND id <> ?';
    params.push(Number(excludeUserId));
  }

  const [[existing]] = await connection.query(
    `SELECT id, name, username FROM users
     WHERE role = 'user'
       AND status <> 'deleted'
       AND (name = ? OR username = ?)${excludeClause}
     LIMIT 1`,
    params,
  );

  return existing || null;
}

export async function permanentlyDeletePlayer(connection, playerId) {
  const id = Number(playerId);
  if (!id) {
    const error = new Error('Invalid player id');
    error.statusCode = 400;
    throw error;
  }

  const [[user]] = await connection.query(
    `SELECT id, name, phone, email, role, status FROM users WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!user) {
    const error = new Error('Player not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'user') {
    const error = new Error('Only player accounts can be permanently deleted');
    error.statusCode = 400;
    throw error;
  }

  console.info('[adminPlayerDelete] deleting user', {
    userId: id,
    username: user.name,
    phone: user.phone,
    email: user.email,
    previousStatus: user.status,
  });

  await deletePlayerChildRecords(connection, id);

  const [result] = await connection.query(`DELETE FROM users WHERE id = ? AND role = 'user'`, [id]);
  const deletedRows = Number(result.affectedRows || 0);

  console.info('[adminPlayerDelete] SQL DELETE result', {
    userId: id,
    username: user.name,
    affectedRows: deletedRows,
  });

  const [[stillExists]] = await connection.query(
    `SELECT id FROM users WHERE id = ? LIMIT 1`,
    [id],
  );

  if (stillExists) {
    const error = new Error('Player row still exists after delete');
    error.statusCode = 500;
    throw error;
  }

  if (deletedRows <= 0) {
    const error = new Error('Failed to permanently delete player account');
    error.statusCode = 500;
    throw error;
  }

  return {
    deleted: true,
    userId: id,
    deletedRows,
    username: user.name,
    phone: user.phone,
    previousStatus: user.status,
  };
}

export async function purgeDeletedPlayerRegistrationConflicts(connection, { phone, name }) {
  const trimmedName = String(name || '').trim();
  const [rows] = await connection.query(
    `SELECT id FROM users
     WHERE role = 'user'
       AND status = 'deleted'
       AND (phone = ? OR name = ? OR username = ?)`,
    [phone, trimmedName, trimmedName],
  );

  for (const row of rows) {
    await permanentlyDeletePlayer(connection, row.id);
  }

  return rows.length;
}

export async function cleanupSoftDeletedPlayers() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, name, phone FROM users WHERE role = 'user' AND status = 'deleted'`,
    );

    let removed = 0;
    for (const row of rows) {
      console.info('[adminPlayerCleanup] purging soft-deleted player', {
        userId: row.id,
        username: row.name,
        phone: row.phone,
      });
      const result = await permanentlyDeletePlayer(connection, row.id);
      removed += Number(result.deletedRows || 0);
    }

    await connection.commit();
    return { removed };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPlayerFinancialSummary(pool, userId) {
  const [[tx]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalDeposit,
       COALESCE(SUM(CASE WHEN type = 'withdraw' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalWithdraw,
       COALESCE(SUM(CASE WHEN type = 'win' AND status = 'approved' THEN amount ELSE 0 END), 0) AS totalWinTx
     FROM transactions
     WHERE user_id = ?`,
    [userId],
  );

  const [[bets]] = await pool.query(
    `SELECT
       COALESCE(SUM(win_amount), 0) AS totalWin,
       COALESCE(SUM(CASE WHEN profit_loss < 0 THEN ABS(profit_loss) ELSE 0 END), 0) AS totalLoss
     FROM bet_records
     WHERE user_id = ?`,
    [userId],
  );

  return {
    totalDeposit: Number(tx.totalDeposit),
    totalWithdraw: Number(tx.totalWithdraw),
    totalWin: Number(bets.totalWin || tx.totalWinTx),
    totalLoss: Number(bets.totalLoss),
  };
}

export default {
  migrateAdminPlayerSchema,
  generateUniqueUserUid,
  logAdminAudit,
  formatPlayerIdentifier,
  findActivePlayerUsernameConflict,
  permanentlyDeletePlayer,
  purgeDeletedPlayerRegistrationConflicts,
  cleanupSoftDeletedPlayers,
  getPlayerFinancialSummary,
};
