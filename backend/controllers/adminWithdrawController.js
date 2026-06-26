import { getPool } from '../config/db.js';
import {
  approveWithdrawTransaction,
  buildWithdrawFilters,
  finalizeWithdrawSideEffects,
  formatUserIdentifier,
  parsePagination,
  rejectWithdrawTransaction,
} from '../services/adminWithdrawService.js';
import { processAffiliateCommissionsForTransaction } from '../services/commissionSettingsService.js';
import { sendWithdrawApprovedSms } from '../services/smsService.js';

export async function listAdminWithdrawals(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildWithdrawFilters(req.query);

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
        type: 'withdraw',
        typeLabel: 'Withdraw',
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.createdAt,
      })),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin withdrawals error:', error);
    return res.status(500).json({ error: 'Failed to fetch withdrawal records' });
  }
}

export async function approveAdminWithdrawal(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid withdrawal id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await approveWithdrawTransaction(connection, transactionId);
    await processAffiliateCommissionsForTransaction(connection, transaction.id);
    await connection.commit();
    await finalizeWithdrawSideEffects(transaction);

    const [[userRow]] = await pool.query(
      `SELECT phone FROM users WHERE id = ? LIMIT 1`,
      [transaction.user_id],
    );
    if (userRow?.phone) {
      await sendWithdrawApprovedSms({
        mobile: userRow.phone,
        amount: transaction.amount,
      });
    }

    return res.json({
      success: true,
      message: 'Withdrawal approved',
      transaction: {
        id: transaction.id,
        status: 'approved',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve withdrawal error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve withdrawal',
    });
  } finally {
    connection.release();
  }
}

export async function rejectAdminWithdrawal(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid withdrawal id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await rejectWithdrawTransaction(connection, transactionId);
    await connection.commit();

    return res.json({
      success: true,
      message: 'Withdrawal rejected',
      transaction: {
        id: transaction.id,
        status: 'rejected',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject withdrawal error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject withdrawal',
    });
  } finally {
    connection.release();
  }
}

export default listAdminWithdrawals;
