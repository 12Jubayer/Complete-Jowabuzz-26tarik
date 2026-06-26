import { getPool } from '../config/db.js';
import {
  approveBonusTransaction,
  buildBonusFilters,
  finalizeBonusSideEffects,
  formatUserIdentifier,
  parsePagination,
  rejectBonusTransaction,
} from '../services/adminBonusService.js';

export async function listAdminBonuses(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildBonusFilters(req.query);

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
        type: 'bonus',
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.createdAt,
      })),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin bonuses error:', error);
    return res.status(500).json({ error: 'Failed to fetch bonus records' });
  }
}

export async function approveAdminBonus(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid bonus id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await approveBonusTransaction(connection, transactionId);
    await connection.commit();
    await finalizeBonusSideEffects(transaction);

    return res.json({
      success: true,
      message: 'Bonus approved',
      transaction: {
        id: transaction.id,
        status: 'approved',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve bonus error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve bonus',
    });
  } finally {
    connection.release();
  }
}

export async function rejectAdminBonus(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid bonus id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await rejectBonusTransaction(connection, transactionId);
    await connection.commit();

    return res.json({
      success: true,
      message: 'Bonus rejected',
      transaction: {
        id: transaction.id,
        status: 'rejected',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject bonus error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject bonus',
    });
  } finally {
    connection.release();
  }
}

export default listAdminBonuses;
