import { getPool } from '../config/db.js';
import {
  approveDepositTransaction,
  buildDepositFilters,
  finalizeDepositSideEffects,
  formatTransactionType,
  formatUserIdentifier,
  parsePagination,
  rejectDepositTransaction,
} from '../services/adminDepositService.js';
import {
  finalizeDepositBonusNotification,
  processDepositBonusTurnover,
} from '../services/bonusTurnoverService.js';
import {
  finalizeDepositBalanceBonusNotification,
  processDepositBalanceBonus,
} from '../services/depositBonusService.js';
import { processAffiliateCommissionsForTransaction } from '../services/commissionSettingsService.js';
import { sendDepositApprovedSms } from '../services/smsService.js';
import {
  resolveDepositChannelFromTransaction,
  setWithdrawChannelOnFirstDeposit,
} from '../services/withdrawChannelService.js';

function formatDepositTypeLabel() {
  return 'Deposit';
}

export async function listAdminDeposits(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildDepositFilters(req.query);

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
      data: rows.map((row) => {
        const displayType = formatTransactionType(row.type, row.method);
        return {
          id: row.id,
          userId: row.userId,
          username: row.username,
          userPhone: row.userPhone,
          userIdentifier: formatUserIdentifier({
            email: row.userEmail,
            phone: row.userPhone,
          }),
          type: displayType,
          typeLabel: formatDepositTypeLabel(),
          amount: Number(row.amount),
          status: row.status,
          createdAt: row.createdAt,
        };
      }),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin deposits error:', error);
    return res.status(500).json({ error: 'Failed to fetch deposit records' });
  }
}

export async function approveAdminDeposit(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid deposit id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await approveDepositTransaction(connection, transactionId);
    await setWithdrawChannelOnFirstDeposit(connection, {
      userId: transaction.user_id,
      depositType: resolveDepositChannelFromTransaction(transaction),
      depositId: transaction.id,
    });
    const bonusResult = await processDepositBonusTurnover(connection, transaction);
    const depositBonusResult = await processDepositBalanceBonus(connection, transaction);
    await processAffiliateCommissionsForTransaction(connection, transaction.id);
    await connection.commit();
    await finalizeDepositSideEffects(transaction);
    if (bonusResult) {
      await finalizeDepositBonusNotification(transaction.user_id, bonusResult);
    }
    if (depositBonusResult) {
      await finalizeDepositBalanceBonusNotification(transaction.user_id, depositBonusResult);
    }

    const [[userRow]] = await pool.query(
      `SELECT phone FROM users WHERE id = ? LIMIT 1`,
      [transaction.user_id],
    );
    if (userRow?.phone) {
      await sendDepositApprovedSms({
        mobile: userRow.phone,
        amount: transaction.amount,
      });
    }

    return res.json({
      success: true,
      message: 'Deposit approved',
      transaction: {
        id: transaction.id,
        status: 'approved',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve deposit error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to approve deposit',
    });
  } finally {
    connection.release();
  }
}

export async function rejectAdminDeposit(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const connection = await pool.getConnection();

  if (!transactionId) {
    return res.status(400).json({ error: 'Invalid deposit id' });
  }

  try {
    await connection.beginTransaction();
    const transaction = await rejectDepositTransaction(connection, transactionId);
    await connection.commit();

    return res.json({
      success: true,
      message: 'Deposit rejected',
      transaction: {
        id: transaction.id,
        status: 'rejected',
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Reject deposit error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to reject deposit',
    });
  } finally {
    connection.release();
  }
}

export default listAdminDeposits;
