import {
  approveTransaction,
  finalizeTransactionSideEffects,
  formatUserIdentifier,
  rejectTransaction,
} from './adminTransactionService.js';
import { notifyWithdrawApproved } from './notificationService.js';
import { assertNotWinypayPendingForManualApproval } from './winypayCallbackService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildWithdrawFilters(query) {
  const filters = ['t.type = ?'];
  const params = ['withdraw'];

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

  return { whereClause: `WHERE ${filters.join(' AND ')}`, params };
}

export { parsePagination, buildWithdrawFilters, formatUserIdentifier };

async function syncWithdrawRequest(connection, transactionId, status) {
  await connection.query(
    `UPDATE withdraw_requests SET status = ? WHERE transaction_id = ?`,
    [status, transactionId],
  );
}

export async function approveWithdrawTransaction(connection, transactionId, options = {}) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ? AND type = 'withdraw'
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Withdraw transaction not found');
    error.statusCode = 404;
    throw error;
  }

  if (!options.fromGatewayCallback) {
    await assertNotWinypayPendingForManualApproval(connection, transactionId, 'withdraw');
  }

  const transaction = await approveTransaction(connection, transactionId);
  await syncWithdrawRequest(connection, transactionId, 'approved');
  return transaction;
}

export async function rejectWithdrawTransaction(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ? AND type = 'withdraw'
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Withdraw transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const transaction = await rejectTransaction(connection, transactionId);
  await syncWithdrawRequest(connection, transactionId, 'rejected');
  return transaction;
}

export async function finalizeWithdrawSideEffects(transaction) {
  const userId = typeof transaction === 'object' ? transaction.user_id : transaction;
  await finalizeTransactionSideEffects(userId);
  if (typeof transaction === 'object' && transaction.type === 'withdraw') {
    await notifyWithdrawApproved(userId, transaction.amount);
  }
}

export default {
  approveWithdrawTransaction,
  rejectWithdrawTransaction,
  finalizeWithdrawSideEffects,
};
