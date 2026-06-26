import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  formatWalletIdentifier,
  generateUniqueWalletUid,
} from '../services/adminEWalletService.js';
import { logAdminAudit } from '../services/adminPlayerService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildWalletFilters(query) {
  const filters = [];
  const params = [];

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    filters.push('w.status = ?');
    params.push(status);
  } else {
    filters.push(`w.status <> 'deleted'`);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(w.name LIKE ? OR w.phone LIKE ? OR w.email LIKE ? OR w.wallet_uid LIKE ? OR CAST(w.id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR w.id = ?' : ''
      })`,
    );
    params.push(like, like, like, like, like);
    if (numericId > 0) {
      params.push(numericId);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params };
}

function getAdminMeta(req) {
  return {
    adminId: Number(req.admin?.sub) || null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  };
}

async function fetchWalletOrThrow(db, walletId, includeDeleted = false) {
  const deletedFilter = includeDeleted ? '' : `AND w.status <> 'deleted'`;
  const [[wallet]] = await db.query(
    `SELECT w.id, w.wallet_uid, w.name, w.phone, w.email, w.balance, w.status,
            w.created_at, w.updated_at
     FROM e_wallets w
     WHERE w.id = ? ${deletedFilter}
     LIMIT 1`,
    [walletId],
  );

  if (!wallet) {
    const error = new Error('E Wallet not found');
    error.statusCode = 404;
    throw error;
  }

  return wallet;
}

function formatWalletRow(row) {
  return {
    id: row.id,
    walletUid: row.wallet_uid,
    name: row.name,
    phone: row.phone,
    email: row.email,
    identifier: formatWalletIdentifier(row),
    role: 'e wallet',
    balance: Number(row.balance),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminEWallets(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildWalletFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM e_wallets w ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT w.id, w.wallet_uid, w.name, w.phone, w.email, w.balance, w.status,
              w.created_at, w.updated_at
       FROM e_wallets w
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map(formatWalletRow),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin e-wallets error:', error);
    return res.status(500).json({ error: 'Failed to fetch e-wallets' });
  }
}

export async function getAdminEWalletInfo(req, res) {
  const pool = getPool();
  const walletId = Number(req.params.id);

  if (!walletId) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }

  try {
    const wallet = await fetchWalletOrThrow(pool, walletId, true);

    const [transactions] = await pool.query(
      `SELECT id, type, amount, reason, status, created_at AS createdAt
       FROM e_wallet_transactions
       WHERE wallet_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [walletId],
    );

    return res.json({
      ...formatWalletRow(wallet),
      latestTransactions: transactions.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get admin e-wallet info error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load e-wallet info',
    });
  }
}

export async function createAdminEWallet(req, res) {
  const pool = getPool();
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const email = String(req.body.email || '').trim().toLowerCase() || null;
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || '');
  const initialBalance = Number(req.body.initialBalance || req.body.initial_balance || 0);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (initialBalance < 0) {
    return res.status(400).json({ error: 'Initial balance cannot be negative' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[existingPhone]] = await connection.query(
      `SELECT id FROM e_wallets WHERE phone = ? AND status <> 'deleted' LIMIT 1`,
      [phone],
    );

    if (existingPhone) {
      await connection.rollback();
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    if (email) {
      const [[existingEmail]] = await connection.query(
        `SELECT id FROM e_wallets WHERE email = ? AND status <> 'deleted' LIMIT 1`,
        [email],
      );

      if (existingEmail) {
        await connection.rollback();
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const passwordHash = await hashPassword(password);
    const walletUid = await generateUniqueWalletUid(connection);

    const [result] = await connection.query(
      `INSERT INTO e_wallets (wallet_uid, name, phone, email, password_hash, balance, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [walletUid, name, phone, email, passwordHash, initialBalance],
    );

    const walletId = result.insertId;

    if (initialBalance > 0) {
      await connection.query(
        `INSERT INTO e_wallet_transactions (wallet_id, type, amount, reason, status)
         VALUES (?, 'add', ?, 'Initial balance', 'completed')`,
        [walletId, initialBalance],
      );
    }

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'e_wallet_create',
      details: { walletId, walletUid, name, phone, initialBalance },
      ipAddress,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'E Wallet created successfully',
      wallet: { id: walletId, walletUid, name, phone, balance: initialBalance },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create admin e-wallet error:', error);
    return res.status(500).json({ error: 'Failed to create e-wallet' });
  } finally {
    connection.release();
  }
}

export async function updateAdminEWalletStatus(req, res) {
  const pool = getPool();
  const walletId = Number(req.params.id);
  const status = String(req.body.status || '').trim().toLowerCase();
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!walletId || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid wallet id or status' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const wallet = await fetchWalletOrThrow(connection, walletId);

    if (wallet.status === 'deleted') {
      await connection.rollback();
      return res.status(400).json({ error: 'Deleted account cannot be updated' });
    }

    await connection.query(`UPDATE e_wallets SET status = ? WHERE id = ?`, [status, walletId]);

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'e_wallet_status_update',
      details: { walletId, from: wallet.status, to: status },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: status === 'active' ? 'E Wallet activated' : 'E Wallet suspended',
      status,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update e-wallet status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update e-wallet status',
    });
  } finally {
    connection.release();
  }
}

export async function adjustAdminEWalletBalance(req, res) {
  const pool = getPool();
  const walletId = Number(req.params.id);
  const type = String(req.body.type || '').trim().toLowerCase();
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || '').trim() || 'Admin balance adjustment';
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!walletId || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ error: 'Invalid wallet id or adjustment type' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  const connection = await pool.getConnection();
  const delta = type === 'add' ? amount : -amount;
  const txType = type === 'add' ? 'add' : 'deduct';

  try {
    await connection.beginTransaction();

    const [[wallet]] = await connection.query(
      `SELECT id, balance, status FROM e_wallets WHERE id = ? AND status <> 'deleted' FOR UPDATE`,
      [walletId],
    );

    if (!wallet) {
      await connection.rollback();
      return res.status(404).json({ error: 'E Wallet not found' });
    }

    const nextBalance = Number(wallet.balance) + delta;
    if (nextBalance < 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    await connection.query(`UPDATE e_wallets SET balance = ? WHERE id = ?`, [nextBalance, walletId]);

    await connection.query(
      `INSERT INTO e_wallet_transactions (wallet_id, type, amount, reason, status)
       VALUES (?, ?, ?, ?, 'completed')`,
      [walletId, txType, amount, reason],
    );

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'e_wallet_balance_adjust',
      details: { walletId, type, amount, reason, balance: nextBalance },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: 'Balance updated successfully',
      balance: nextBalance,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Adjust e-wallet balance error:', error);
    return res.status(500).json({ error: 'Failed to adjust e-wallet balance' });
  } finally {
    connection.release();
  }
}

export async function deleteAdminEWallet(req, res) {
  const pool = getPool();
  const walletId = Number(req.params.id);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!walletId) {
    return res.status(400).json({ error: 'Invalid wallet id' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await fetchWalletOrThrow(connection, walletId, true);

    await connection.query(`UPDATE e_wallets SET status = 'deleted' WHERE id = ?`, [walletId]);

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'e_wallet_delete',
      details: { walletId, softDelete: true },
      ipAddress,
    });

    await connection.commit();

    return res.json({ success: true, message: 'E Wallet deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete e-wallet error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete e-wallet',
    });
  } finally {
    connection.release();
  }
}

export default listAdminEWallets;
