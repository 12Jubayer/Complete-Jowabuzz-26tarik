import { getPool } from '../config/db.js';
import {
  approveTransaction,
  finalizeTransactionSideEffects,
  formatTransactionType,
  formatUserIdentifier,
  rejectTransaction,
} from '../services/adminTransactionService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildListFilters(query) {
  const filters = [];
  const params = [];

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    filters.push('t.status = ?');
    params.push(status);
  }

  const startDate = String(query.startDate || '').trim();
  if (startDate) {
    filters.push('DATE(t.created_at) >= ?');
    params.push(startDate);
  }

  const endDate = String(query.endDate || '').trim();
  if (endDate) {
    filters.push('DATE(t.created_at) <= ?');
    params.push(endDate);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR CAST(u.id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR u.id = ?' : ''
      })`,
    );
    params.push(like, like, like, like);
    if (numericId > 0) {
      params.push(numericId);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  return { whereClause, params };
}

export async function listAdminTransactions(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildListFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT
         t.id,
         t.user_id AS userId,
         u.name AS username,
         u.phone AS userPhone,
         u.email AS userEmail,
         t.type,
         t.method,
         t.amount,
         t.status,
         t.created_at AS createdAt
       FROM transactions t
       INNER JOIN users u ON u.id = t.user_id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        username: row.username,
        userPhone: row.userPhone,
        userIdentifier: formatUserIdentifier({
          email: row.userEmail,
          phone: row.userPhone,
        }),
        type: formatTransactionType(row.type, row.method),
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.createdAt,
      })),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin transactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

export async function approveAdminTransaction(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid transaction id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await approveTransaction(connection, transactionId);
    await connection.commit();
    await finalizeTransactionSideEffects(transaction.user_id);

    return res.json({
      success: true,
      message: 'Transaction approved',
      transaction: {
        id: transaction.id,
        status: 'approved',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve transaction error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve transaction',
    });
  } finally {
    connection.release();
  }
}

export async function rejectAdminTransaction(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid transaction id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await rejectTransaction(connection, transactionId);
    await connection.commit();

    return res.json({
      success: true,
      message: 'Transaction rejected',
      transaction: {
        id: transaction.id,
        status: 'rejected',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject transaction error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject transaction',
    });
  } finally {
    connection.release();
  }
}

export default listAdminTransactions;
