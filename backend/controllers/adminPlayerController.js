import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  findActivePlayerUsernameConflict,
  formatPlayerIdentifier,
  generateUniqueUserUid,
  getPlayerFinancialSummary,
  logAdminAudit,
  permanentlyDeletePlayer,
  purgeDeletedPlayerRegistrationConflicts,
} from '../services/adminPlayerService.js';
import { applyBalanceDelta, ensureWallet, syncAllWalletBalances } from '../services/gameWalletService.js';
import { ensureUserWallet } from '../services/userWalletService.js';
import { createAffiliateProfile } from '../services/affiliateService.js';
import {
  adminUpdateWithdrawChannel,
  listWithdrawChannelLogs,
} from '../services/withdrawChannelService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPlayerFilters(query) {
  const filters = [`u.role = 'user'`];
  const params = [];

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    filters.push('u.status = ?');
    params.push(status);
  } else {
    filters.push(`u.status <> 'deleted'`);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.user_uid LIKE ? OR CAST(u.id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR u.id = ?' : ''
      })`,
    );
    params.push(like, like, like, like, like);
    if (numericId > 0) {
      params.push(numericId);
    }
  }

  return { whereClause: `WHERE ${filters.join(' AND ')}`, params };
}

function getAdminMeta(req) {
  return {
    adminId: Number(req.admin?.sub) || null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  };
}

async function fetchPlayerOrThrow(db, playerId, includeDeleted = false) {
  const filters = includeDeleted ? '' : `AND u.status <> 'deleted'`;
  const [[user]] = await db.query(
    `SELECT u.id, u.user_uid, u.name, u.phone, u.email, u.role, u.balance, u.status,
            u.withdraw_blocked, u.withdraw_channel, u.created_at, u.last_login, u.last_login_ip
     FROM users u
     WHERE u.id = ? AND u.role = 'user' ${filters}
     LIMIT 1`,
    [playerId],
  );

  if (!user) {
    const error = new Error('Player not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

export async function listAdminPlayers(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildPlayerFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.user_uid AS userUid, u.name, u.phone, u.email, u.role, u.balance, u.status,
              u.withdraw_blocked AS withdrawBlocked, u.created_at AS createdAt,
              u.last_login AS lastLogin, u.last_login_ip AS lastLoginIp
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    console.info('[adminPlayerList] query result', {
      total: Number(total),
      returned: rows.length,
      search: String(req.query.search || '').trim() || null,
      ids: rows.map((row) => row.id),
    });

    return res.json({
      data: rows.map((row) => ({
        id: row.id,
        userUid: row.userUid,
        name: row.name,
        phone: row.phone,
        email: row.email,
        identifier: formatPlayerIdentifier(row),
        role: 'player',
        balance: Number(row.balance),
        status: row.status,
        withdrawBlocked: Boolean(row.withdrawBlocked),
        createdAt: row.createdAt,
        lastLogin: row.lastLogin,
        lastLoginIp: row.lastLoginIp,
      })),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin players error:', error);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
}

export async function getAdminPlayerInfo(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);

  if (!playerId) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  try {
    const user = await fetchPlayerOrThrow(pool, playerId, true);
    const summary = await getPlayerFinancialSummary(pool, playerId);

    const [betRows] = await pool.query(
      `SELECT created_at AS createdAt, game_name AS gameName, bet_amount AS betAmount,
              win_amount AS payout, profit_loss AS profitLoss
       FROM bet_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [playerId],
    );

    const [gameRoundRows] = await pool.query(
      `SELECT gr.created_at AS createdAt, g.name AS gameName, gr.bet_amount AS betAmount,
              gr.win_amount AS payout, gr.net_amount AS profitLoss
       FROM game_rounds gr
       INNER JOIN games g ON g.id = gr.game_id
       WHERE gr.user_id = ?
       ORDER BY gr.created_at DESC
       LIMIT 100`,
      [playerId],
    );

    const bettingHistory = [...betRows, ...gameRoundRows]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100)
      .map((row) => ({
        date: row.createdAt,
        game: row.gameName,
        bet: Number(row.betAmount),
        payout: Number(row.payout),
        result:
          Number(row.profitLoss) > 0 ? 'win' : Number(row.profitLoss) < 0 ? 'loss' : 'draw',
      }));

    const withdrawChannelLogs = await listWithdrawChannelLogs(playerId, 20);

    return res.json({
      id: user.id,
      userUid: user.user_uid,
      name: user.name,
      phone: user.phone,
      email: user.email || user.phone,
      role: 'player',
      status: user.status,
      balance: Number(user.balance),
      withdrawChannel: user.withdraw_channel || null,
      withdrawChannelLogs,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      lastLoginIp: user.last_login_ip,
      ...summary,
      bettingHistory,
    });
  } catch (error) {
    console.error('Get admin player info error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load player info',
    });
  }
}

export async function createAdminPlayer(req, res) {
  const pool = getPool();
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || '');

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const connection = await pool.getConnection();
  const { adminId, ipAddress } = getAdminMeta(req);

  try {
    await connection.beginTransaction();

    await purgeDeletedPlayerRegistrationConflicts(connection, { phone, name });

    const [[existing]] = await connection.query(
      `SELECT id FROM users WHERE phone = ? AND status <> 'deleted' LIMIT 1`,
      [phone],
    );

    if (existing) {
      await connection.rollback();
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const existingByName = await findActivePlayerUsernameConflict(connection, name);
    if (existingByName) {
      await connection.rollback();
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const userUid = await generateUniqueUserUid(pool, connection);

    const [result] = await connection.query(
      `INSERT INTO users (user_uid, name, username, email, phone, password_hash, role, balance, status)
       VALUES (?, ?, ?, NULL, ?, ?, 'user', 0, 'active')`,
      [userUid, name, name, phone, passwordHash],
    );

    const userId = result.insertId;
    await ensureUserWallet(userId, connection);
    await ensureWallet(userId, connection);

    await logAdminAudit(connection, {
      adminId,
      userId,
      action: 'player_create',
      details: { name, phone, userUid },
      ipAddress,
    });

    await connection.commit();

    try {
      await createAffiliateProfile(userId);
    } catch {
      // affiliate profile optional
    }

    return res.status(201).json({
      success: true,
      message: 'Player created successfully',
      player: { id: userId, userUid, name, phone },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create admin player error:', error);
    return res.status(500).json({ error: 'Failed to create player' });
  } finally {
    connection.release();
  }
}

export async function changeAdminPlayerPassword(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const newPassword = String(req.body.password || req.body.newPassword || '');

  if (!playerId) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    await fetchPlayerOrThrow(pool, playerId, true);
    const passwordHash = await hashPassword(newPassword);

    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, playerId]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change player password error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update password',
    });
  }
}

export async function deleteAdminPlayer(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const connection = await pool.getConnection();
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!playerId) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  try {
    await connection.beginTransaction();
    const user = await fetchPlayerOrThrow(connection, playerId, true);

    console.info('[adminPlayerDelete] API request', {
      playerId,
      username: user.name,
      phone: user.phone,
      adminId,
    });

    await logAdminAudit(connection, {
      adminId,
      userId: playerId,
      action: 'player_delete',
      details: {
        permanent: true,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
      ipAddress,
    });

    const deleteResult = await permanentlyDeletePlayer(connection, playerId);

    if (!deleteResult.deleted || Number(deleteResult.deletedRows) <= 0) {
      const error = new Error('Failed to permanently delete player account');
      error.statusCode = 500;
      throw error;
    }

    await connection.commit();

    const [[verifyDeleted]] = await pool.query(
      `SELECT id FROM users WHERE id = ? LIMIT 1`,
      [playerId],
    );

    if (verifyDeleted) {
      console.error('[adminPlayerDelete] post-commit verify failed', { playerId });
      return res.status(500).json({ error: 'Player delete did not persist in database' });
    }

    console.info('[adminPlayerDelete] completed', {
      playerId: deleteResult.userId,
      username: deleteResult.username,
      deletedRows: deleteResult.deletedRows,
    });

    return res.json({
      success: true,
      message: 'Account deleted successfully',
      deletedRows: deleteResult.deletedRows,
      userId: deleteResult.userId,
      username: deleteResult.username,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete player error:', {
      playerId,
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete player',
    });
  } finally {
    connection.release();
  }
}

export async function updateAdminPlayerStatus(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const status = String(req.body.status || '').trim().toLowerCase();
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!playerId || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid player id or status' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const user = await fetchPlayerOrThrow(connection, playerId, true);

    if (user.status === 'deleted') {
      await connection.rollback();
      return res.status(400).json({ error: 'Deleted account cannot be updated' });
    }

    await connection.query(`UPDATE users SET status = ? WHERE id = ?`, [status, playerId]);

    await logAdminAudit(connection, {
      adminId,
      userId: playerId,
      action: 'player_status_update',
      details: { from: user.status, to: status },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: status === 'active' ? 'Player activated' : 'Player suspended',
      status,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update player status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update player status',
    });
  } finally {
    connection.release();
  }
}

export async function updateAdminPlayerWithdrawBlock(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const blocked = Boolean(req.body.blocked ?? req.body.withdrawBlocked ?? req.body.withdraw_blocked);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!playerId) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const user = await fetchPlayerOrThrow(connection, playerId, true);

    if (user.status === 'deleted') {
      await connection.rollback();
      return res.status(400).json({ error: 'Deleted account cannot be updated' });
    }

    await connection.query(`UPDATE users SET withdraw_blocked = ? WHERE id = ?`, [
      blocked ? 1 : 0,
      playerId,
    ]);

    await logAdminAudit(connection, {
      adminId,
      userId: playerId,
      action: blocked ? 'player_withdraw_block' : 'player_withdraw_unblock',
      details: { withdrawBlocked: blocked },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: blocked ? 'Withdraw blocked for this player' : 'Withdraw approved for this player',
      withdrawBlocked: blocked,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update player withdraw block error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update withdraw block',
    });
  } finally {
    connection.release();
  }
}

export async function adjustAdminPlayerBalance(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const type = String(req.body.type || '').trim().toLowerCase();
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || '').trim() || 'Admin balance adjustment';
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!playerId || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ error: 'Invalid player id or adjustment type' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  const connection = await pool.getConnection();
  const delta = type === 'add' ? amount : -amount;

  try {
    await connection.beginTransaction();
    await fetchPlayerOrThrow(connection, playerId, true);

    const nextBalance = await applyBalanceDelta(connection, playerId, delta);

    const [txResult] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'adjustment', ?, 'approved', ?, NOW())`,
      [playerId, amount, `admin_${type}:${reason.slice(0, 80)}`],
    );

    await logAdminAudit(connection, {
      adminId,
      userId: playerId,
      action: 'player_balance_adjust',
      details: { type, amount, reason, transactionId: txResult.insertId, balance: nextBalance },
      ipAddress,
    });

    await connection.commit();
    await syncAllWalletBalances(playerId);

    return res.json({
      success: true,
      message: 'Balance updated successfully',
      balance: nextBalance,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Adjust player balance error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to adjust balance',
    });
  } finally {
    connection.release();
  }
}

export async function updateAdminPlayerWithdrawChannel(req, res) {
  const pool = getPool();
  const playerId = Number(req.params.id);
  const newChannel = String(req.body.withdrawChannel || req.body.withdraw_channel || '').trim();
  const { adminId } = getAdminMeta(req);

  if (!playerId) {
    return res.status(400).json({ error: 'Invalid player id' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await fetchPlayerOrThrow(connection, playerId, true);
    const result = await adminUpdateWithdrawChannel(connection, {
      userId: playerId,
      newChannel,
      adminId,
    });

    await logAdminAudit(connection, {
      adminId,
      userId: playerId,
      action: 'player_withdraw_channel_update',
      details: {
        oldChannel: result.oldChannel,
        newChannel: result.channel,
        changed: result.changed,
      },
      ipAddress: getAdminMeta(req).ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: 'Withdraw channel updated',
      withdrawChannel: result.channel,
      changed: result.changed,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update player withdraw channel error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update withdraw channel',
    });
  } finally {
    connection.release();
  }
}

export default listAdminPlayers;
