import { addRequiredTurnover, syncWalletBalance } from './userWalletService.js';

export function formatTransactionType(type, method) {
  if (type === 'deposit' && method === 'agent') {
    return 'agent_topup';
  }
  return type;
}

export function formatUserIdentifier(user) {
  if (user.email) return user.email;
  return `${user.phone}@phone.jowabuzz.app`;
}

function isCreditType(type, method) {
  if (type === 'bonus' || type === 'adjustment') return true;
  if (type === 'deposit') return true;
  return false;
}

export async function approveTransaction(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ?
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const transaction = rows[0];

  if (transaction.status === 'approved') {
    const error = new Error('Transaction is already approved');
    error.statusCode = 409;
    throw error;
  }

  if (transaction.status === 'rejected') {
    const error = new Error('Transaction is already rejected');
    error.statusCode = 409;
    throw error;
  }

  if (transaction.status !== 'pending') {
    const error = new Error('Only pending transactions can be approved');
    error.statusCode = 400;
    throw error;
  }

  if (transaction.type === 'withdraw') {
    const [[user]] = await connection.query(
      `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
      [transaction.user_id],
    );

    if (!user || Number(user.balance) < Number(transaction.amount)) {
      const error = new Error('Insufficient user balance');
      error.statusCode = 400;
      throw error;
    }

    await connection.query(
      `UPDATE users SET balance = balance - ? WHERE id = ?`,
      [transaction.amount, transaction.user_id],
    );
  } else if (isCreditType(transaction.type, transaction.method)) {
    await connection.query(
      `UPDATE users SET balance = balance + ? WHERE id = ?`,
      [transaction.amount, transaction.user_id],
    );

    if (transaction.type === 'deposit') {
      await addRequiredTurnover(
        transaction.user_id,
        transaction.amount,
        transaction.method === 'agent' ? 'agent_topup' : 'deposit',
        connection,
      );
    }
  }

  const approvedAt = new Date();

  await connection.query(
    `UPDATE transactions
     SET status = 'approved', approved_at = ?
     WHERE id = ?`,
    [approvedAt, transactionId],
  );

  return {
    ...transaction,
    status: 'approved',
    approved_at: approvedAt,
  };
}

export async function rejectTransaction(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT id, user_id, type, amount, status, method
     FROM transactions
     WHERE id = ?
     FOR UPDATE`,
    [transactionId],
  );

  if (!rows.length) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }

  const transaction = rows[0];

  if (transaction.status === 'approved') {
    const error = new Error('Transaction is already approved');
    error.statusCode = 409;
    throw error;
  }

  if (transaction.status === 'rejected') {
    const error = new Error('Transaction is already rejected');
    error.statusCode = 409;
    throw error;
  }

  if (transaction.status !== 'pending') {
    const error = new Error('Only pending transactions can be rejected');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(
    `UPDATE transactions
     SET status = 'rejected', approved_at = NULL
     WHERE id = ?`,
    [transactionId],
  );

  return {
    ...transaction,
    status: 'rejected',
    approved_at: null,
  };
}

export async function finalizeTransactionSideEffects(userId) {
  if (userId) {
    await syncWalletBalance(userId);
  }
}

export default {
  approveTransaction,
  rejectTransaction,
  formatTransactionType,
  formatUserIdentifier,
};
