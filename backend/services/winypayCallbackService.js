import { getPool } from '../config/db.js';
import {
  approveDepositTransaction,
  finalizeDepositSideEffects,
  rejectDepositTransaction,
} from './adminDepositService.js';
import {
  approveWithdrawTransaction,
  finalizeWithdrawSideEffects,
  rejectWithdrawTransaction,
} from './adminWithdrawService.js';
import {
  finalizeDepositBonusNotification,
  processDepositBonusTurnover,
} from './bonusTurnoverService.js';
import {
  finalizeDepositBalanceBonusNotification,
  processDepositBalanceBonus,
} from './depositBonusService.js';
import { processAffiliateCommissionsForTransaction } from './commissionSettingsService.js';
import { sendDepositApprovedSms, sendWithdrawApprovedSms } from './smsService.js';
import {
  resolveDepositChannelFromTransaction,
  setWithdrawChannelOnFirstDeposit,
} from './withdrawChannelService.js';
import {
  findWinypayOrderByOrderId,
  logWinypay,
  updateWinypayOrder,
  verifyWinypayCallbackSignature,
} from './winypayService.js';

const CALLBACK_OK = { status: 'ok', message: 'Callback received successfully' };

function normalizeCallbackStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'success' || value === 'successful' || value === 'completed') return 'success';
  if (value === 'failed' || value === 'error' || value === 'rejected') return 'failed';
  return value;
}

function parseCallbackPayload(rawBody, parsedBody) {
  if (parsedBody && typeof parsedBody === 'object' && Object.keys(parsedBody).length) {
    return parsedBody;
  }
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
}

async function isGatewayTransactionProcessed(connection, gatewayTransactionId, excludeOrderId) {
  if (!gatewayTransactionId) return false;
  const [rows] = await connection.query(
    `SELECT id FROM winypay_payment_orders
     WHERE gateway_transaction_id = ? AND status = 'success' AND order_id <> ?
     LIMIT 1`,
    [gatewayTransactionId, excludeOrderId],
  );
  return rows.length > 0;
}

async function finalizeWinypayDepositSuccess(connection, transaction) {
  await setWithdrawChannelOnFirstDeposit(connection, {
    userId: transaction.user_id,
    depositType: resolveDepositChannelFromTransaction(transaction),
    depositId: transaction.id,
  });
  const bonusResult = await processDepositBonusTurnover(connection, transaction);
  const depositBonusResult = await processDepositBalanceBonus(connection, transaction);
  await processAffiliateCommissionsForTransaction(connection, transaction.id);
  return { bonusResult, depositBonusResult };
}

async function notifyDepositSuccess(pool, transaction, bonusResults) {
  await finalizeDepositSideEffects(transaction);
  if (bonusResults.bonusResult) {
    await finalizeDepositBonusNotification(transaction.user_id, bonusResults.bonusResult);
  }
  if (bonusResults.depositBonusResult) {
    await finalizeDepositBalanceBonusNotification(
      transaction.user_id,
      bonusResults.depositBonusResult,
    );
  }
  const [[userRow]] = await pool.query(`SELECT phone FROM users WHERE id = ? LIMIT 1`, [
    transaction.user_id,
  ]);
  if (userRow?.phone) {
    await sendDepositApprovedSms({ mobile: userRow.phone, amount: transaction.amount });
  }
}

async function notifyWithdrawSuccess(pool, transaction) {
  await finalizeWithdrawSideEffects(transaction);
  const [[userRow]] = await pool.query(`SELECT phone FROM users WHERE id = ? LIMIT 1`, [
    transaction.user_id,
  ]);
  if (userRow?.phone) {
    await sendWithdrawApprovedSms({ mobile: userRow.phone, amount: transaction.amount });
  }
}

export async function processWinypayDepositCallback({ rawBody, signature, parsedBody }) {
  const pool = getPool();
  const payload = parseCallbackPayload(rawBody, parsedBody);

  logWinypay('deposit_callback_received', {
    order_id: payload.order_id,
    status: payload.status,
    transaction_id: payload.transaction_id,
    signaturePresent: Boolean(signature),
  });

  if (!verifyWinypayCallbackSignature(rawBody, signature)) {
    logWinypay('deposit_callback_invalid_signature', { order_id: payload.order_id });
    const error = new Error('Invalid callback signature');
    error.statusCode = 401;
    throw error;
  }

  const orderId = String(payload.order_id || '').trim();
  if (!orderId) {
    const error = new Error('order_id is required');
    error.statusCode = 400;
    throw error;
  }

  const callbackStatus = normalizeCallbackStatus(payload.status);
  const gatewayTransactionId = String(payload.transaction_id || '').trim() || null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const order = await findWinypayOrderByOrderId(connection, orderId, { forUpdate: true });
    if (!order || order.order_type !== 'deposit') {
      await connection.rollback();
      const error = new Error('Deposit order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status === 'success') {
      await connection.commit();
      return CALLBACK_OK;
    }

    if (
      gatewayTransactionId &&
      (await isGatewayTransactionProcessed(connection, gatewayTransactionId, orderId))
    ) {
      await updateWinypayOrder(connection, orderId, {
        status: 'success',
        gateway_transaction_id: gatewayTransactionId,
        callback_payload: JSON.stringify(payload),
        callback_signature: signature || null,
        processed_at: new Date(),
      });
      await connection.commit();
      return CALLBACK_OK;
    }

    await updateWinypayOrder(connection, orderId, {
      gateway_transaction_id: gatewayTransactionId,
      callback_payload: JSON.stringify(payload),
      callback_signature: signature || null,
      callback_message: String(payload.status || ''),
    });

    if (callbackStatus === 'success') {
      let transaction;
      try {
        transaction = await approveDepositTransaction(connection, order.transaction_id, {
          fromGatewayCallback: true,
        });
      } catch (error) {
        if (error.statusCode === 409) {
          const [[existing]] = await connection.query(
            `SELECT status FROM transactions WHERE id = ? LIMIT 1`,
            [order.transaction_id],
          );
          if (existing?.status === 'approved') {
            await updateWinypayOrder(connection, orderId, {
              status: 'success',
              processed_at: new Date(),
            });
            await connection.commit();
            return CALLBACK_OK;
          }
        }
        throw error;
      }
      const bonusResults = await finalizeWinypayDepositSuccess(connection, transaction);
      await updateWinypayOrder(connection, orderId, {
        status: 'success',
        processed_at: new Date(),
      });
      await connection.commit();
      await notifyDepositSuccess(pool, transaction, bonusResults);
      return CALLBACK_OK;
    }

    if (callbackStatus === 'failed') {
      await rejectDepositTransaction(connection, order.transaction_id);
      await updateWinypayOrder(connection, orderId, {
        status: 'failed',
        processed_at: new Date(),
      });
      await connection.commit();
      return CALLBACK_OK;
    }

    await connection.commit();
    return CALLBACK_OK;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function processWinypayWithdrawCallback({ rawBody, signature, parsedBody }) {
  const pool = getPool();
  const payload = parseCallbackPayload(rawBody, parsedBody);

  logWinypay('withdraw_callback_received', {
    order_id: payload.order_id,
    status: payload.status,
    transaction_id: payload.transaction_id,
    signaturePresent: Boolean(signature),
  });

  if (!verifyWinypayCallbackSignature(rawBody, signature)) {
    logWinypay('withdraw_callback_invalid_signature', { order_id: payload.order_id });
    const error = new Error('Invalid callback signature');
    error.statusCode = 401;
    throw error;
  }

  const orderId = String(payload.order_id || '').trim();
  if (!orderId) {
    const error = new Error('order_id is required');
    error.statusCode = 400;
    throw error;
  }

  const callbackStatus = normalizeCallbackStatus(payload.status);
  const gatewayTransactionId = String(payload.transaction_id || '').trim() || null;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const order = await findWinypayOrderByOrderId(connection, orderId, { forUpdate: true });
    if (!order || order.order_type !== 'withdraw') {
      await connection.rollback();
      const error = new Error('Withdrawal order not found');
      error.statusCode = 404;
      throw error;
    }

    if (order.status === 'success') {
      await connection.commit();
      return CALLBACK_OK;
    }

    if (
      gatewayTransactionId &&
      (await isGatewayTransactionProcessed(connection, gatewayTransactionId, orderId))
    ) {
      await updateWinypayOrder(connection, orderId, {
        status: 'success',
        gateway_transaction_id: gatewayTransactionId,
        callback_payload: JSON.stringify(payload),
        callback_signature: signature || null,
        processed_at: new Date(),
      });
      await connection.commit();
      return CALLBACK_OK;
    }

    await updateWinypayOrder(connection, orderId, {
      gateway_transaction_id: gatewayTransactionId,
      callback_payload: JSON.stringify(payload),
      callback_signature: signature || null,
      callback_message: String(payload.status || ''),
    });

    if (callbackStatus === 'success') {
      let transaction;
      try {
        transaction = await approveWithdrawTransaction(connection, order.transaction_id, {
          fromGatewayCallback: true,
        });
      } catch (error) {
        if (error.statusCode === 409) {
          const [[existing]] = await connection.query(
            `SELECT status FROM transactions WHERE id = ? LIMIT 1`,
            [order.transaction_id],
          );
          if (existing?.status === 'approved') {
            await updateWinypayOrder(connection, orderId, {
              status: 'success',
              processed_at: new Date(),
            });
            await connection.commit();
            return CALLBACK_OK;
          }
        }
        throw error;
      }
      await processAffiliateCommissionsForTransaction(connection, transaction.id);
      await updateWinypayOrder(connection, orderId, {
        status: 'success',
        processed_at: new Date(),
      });
      await connection.commit();
      await notifyWithdrawSuccess(pool, transaction);
      return CALLBACK_OK;
    }

    if (callbackStatus === 'failed') {
      await rejectWithdrawTransaction(connection, order.transaction_id);
      await updateWinypayOrder(connection, orderId, {
        status: 'failed',
        processed_at: new Date(),
      });
      await connection.commit();
      return CALLBACK_OK;
    }

    await connection.commit();
    return CALLBACK_OK;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function assertNotWinypayPendingForManualApproval(connection, transactionId, type) {
  const [rows] = await connection.query(
    `SELECT id, status, order_type
     FROM winypay_payment_orders
     WHERE transaction_id = ? AND order_type = ?
     ORDER BY id DESC
     LIMIT 1`,
    [transactionId, type],
  );
  const order = rows[0];
  if (!order) return;
  if (order.status === 'awaiting_callback' || order.status === 'initiated') {
    const error = new Error('This transaction is awaiting WinyPay callback and cannot be approved manually');
    error.statusCode = 409;
    throw error;
  }
}

export default {
  processWinypayDepositCallback,
  processWinypayWithdrawCallback,
  assertNotWinypayPendingForManualApproval,
};
