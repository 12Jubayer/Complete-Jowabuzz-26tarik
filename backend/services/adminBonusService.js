import {
  approveTransaction,
  finalizeTransactionSideEffects,
  formatUserIdentifier,
  rejectTransaction,
} from './adminTransactionService.js';
import { notifyBonusReleased } from './notificationService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildBonusFilters(query) {
  const filters = ['t.type = ?'];
  const params = ['bonus'];

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

export { parsePagination, buildBonusFilters, formatUserIdentifier };

export async function syncBonusRecord(connection, transaction) {
  const title = transaction.method || 'Admin Bonus';

  const [[existing]] = await connection.query(
    `SELECT id FROM bonus_records WHERE transaction_id = ? LIMIT 1`,
    [transaction.id],
  );

  if (existing) {
    await connection.query(
      `UPDATE bonus_records SET status = ?, amount = ? WHERE transaction_id = ?`,
      [transaction.status, transaction.amount, transaction.id],
    );
    return;
  }

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, ?, ?)`,
    [transaction.user_id, title, transaction.amount, transaction.status, transaction.id],
  );
}

export async function approveBonusTransaction(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ? AND type = 'bonus'
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Bonus transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const transaction = await approveTransaction(connection, transactionId);
  await syncBonusRecord(connection, { ...transaction, status: 'approved' });
  return transaction;
}

export async function rejectBonusTransaction(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ? AND type = 'bonus'
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Bonus transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const transaction = await rejectTransaction(connection, transactionId);

  await connection.query(
    `UPDATE bonus_records SET status = 'rejected' WHERE transaction_id = ?`,
    [transactionId],
  );

  return transaction;
}

export async function finalizeBonusSideEffects(transaction) {
  const userId = typeof transaction === 'object' ? transaction.user_id : transaction;
  await finalizeTransactionSideEffects(userId);
  if (typeof transaction === 'object' && transaction.type === 'bonus') {
    await notifyBonusReleased(userId, transaction.amount, 'Bonus added successfully');
  }
}

export default {
  approveBonusTransaction,
  rejectBonusTransaction,
  finalizeBonusSideEffects,
  syncBonusRecord,
};
