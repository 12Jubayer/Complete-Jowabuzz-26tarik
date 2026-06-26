import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'logs', 'winypay.log');

const SENSITIVE_KEYS = new Set([
  'secret_key',
  'secretKey',
  'payout_key',
  'payoutKey',
  'api_key',
  'apiKey',
]);

function trim(value) {
  return String(value ?? '').trim();
}

function maskValue(value) {
  const text = trim(value);
  if (!text) return '';
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

export function maskWinypayPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = Array.isArray(payload) ? [...payload] : { ...payload };
  for (const key of Object.keys(copy)) {
    if (SENSITIVE_KEYS.has(key)) {
      copy[key] = maskValue(copy[key]);
    } else if (copy[key] && typeof copy[key] === 'object') {
      copy[key] = maskWinypayPayload(copy[key]);
    }
  }
  return copy;
}

function writeLog(entry) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  console.log('[WINYPAY]', line);
  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  } catch (error) {
    console.error('[WINYPAY] log write failed:', error.message);
  }
}

export function logWinypay(event, data = {}) {
  writeLog({ event, ...maskWinypayPayload(data) });
}

export function getPublicAppBaseUrl() {
  return (
    trim(process.env.PUBLIC_APP_URL) ||
    trim(process.env.APP_URL) ||
    'https://jowabuzz.com'
  ).replace(/\/$/, '');
}

const WINYPAY_LEGACY_DEPOSIT_API_BASE = 'https://bd.winypay.com';

function resolveWinypayDepositApiBase(baseUrl) {
  const override = trim(process.env.WINYPAY_DEPOSIT_API_BASE_URL);
  if (override) return override.replace(/\/$/, '');
  // Provider portal moved to bd.gopostman.com; deposit pay_url is still returned on winypay host.
  if (baseUrl.includes('gopostman.com')) return WINYPAY_LEGACY_DEPOSIT_API_BASE;
  return baseUrl;
}

export function extractWinypayPayUrl(data) {
  if (!data || typeof data !== 'object') return '';
  return trim(
    data.pay_url ||
      data.payUrl ||
      data.payment_url ||
      data.paymentUrl ||
      data.redirect_url ||
      data.redirectUrl ||
      data.url,
  );
}

export function getWinypayConfig() {
  const baseUrl = (trim(process.env.WINYPAY_BASE_URL) || 'https://bd.gopostman.com').replace(/\/$/, '');
  const depositApiBaseUrl = resolveWinypayDepositApiBase(baseUrl);
  const merchantCode = trim(process.env.WINYPAY_MERCHANT_CODE);
  const secretKey = trim(process.env.WINYPAY_SECRET_KEY);
  const payoutKey = trim(process.env.WINYPAY_PAYOUT_KEY);
  const currency = trim(process.env.WINYPAY_CURRENCY) || 'BDT';
  const publicBase = getPublicAppBaseUrl();

  return {
    baseUrl,
    depositApiBaseUrl,
    merchantCode,
    secretKey,
    payoutKey,
    currency,
    depositEndpoint: `${depositApiBaseUrl}/api/merchant/payin/deposit.php`,
    withdrawEndpoint: `${baseUrl}/api/merchant/payout/withdrawal.php`,
    depositCallbackUrl:
      trim(process.env.WINYPAY_DEPOSIT_CALLBACK_URL) ||
      `${publicBase}/api/payment/winypay/deposit-callback`,
    withdrawCallbackUrl:
      trim(process.env.WINYPAY_WITHDRAW_CALLBACK_URL) ||
      `${publicBase}/api/payment/winypay/withdraw-callback`,
    jumpUrl: trim(process.env.WINYPAY_JUMP_URL) || `${publicBase}/profile/deposit`,
  };
}

export function isWinypayConfigured() {
  const config = getWinypayConfig();
  return Boolean(config.merchantCode && config.secretKey && config.payoutKey);
}

export function assertWinypayConfigured() {
  const config = getWinypayConfig();
  if (!config.merchantCode) {
    const error = new Error('WINYPAY_MERCHANT_CODE is not configured');
    error.statusCode = 503;
    throw error;
  }
  if (!config.secretKey) {
    const error = new Error('WINYPAY_SECRET_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }
  if (!config.payoutKey) {
    const error = new Error('WINYPAY_PAYOUT_KEY is not configured');
    error.statusCode = 503;
    throw error;
  }
  return config;
}

export function formatWinypayAmount(amount) {
  return Number(amount).toFixed(2);
}

export function formatWinypayTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function normalizeWinypayPayType(method = '') {
  const normalized = trim(method).toLowerCase();
  if (normalized.includes('nagad')) return 'nagad';
  if (normalized.includes('bkash')) return 'bkash';
  if (normalized === 'nagad' || normalized === 'bkash') return normalized;
  const error = new Error('WinyPay supports bkash and nagad only');
  error.statusCode = 400;
  throw error;
}

export function buildDepositOrderId(userId) {
  return `DEP-${Date.now()}-${userId}`;
}

export function buildWithdrawOrderId(userId) {
  return `WDR-${Date.now()}-${userId}`;
}

export function verifyWinypayCallbackSignature(rawBody, signatureHeader) {
  const config = assertWinypayConfigured();
  const provided = trim(signatureHeader);
  if (!provided || !rawBody) return false;

  const expected = crypto.createHmac('sha256', config.secretKey).update(rawBody).digest('hex');
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

async function postWinypayJson(url, payload) {
  logWinypay('api_request', { url, payload });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error('Invalid JSON response from WinyPay');
    error.statusCode = 502;
    throw error;
  }

  logWinypay('api_response', { url, status: response.status, data });
  return { httpStatus: response.status, data };
}

export async function migrateWinypaySchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'winypay_payment_orders.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await pool.query(statement);
  }
}

export async function createWinypayOrderRecord(connection, {
  transactionId,
  userId,
  orderType,
  orderId,
  payType,
  amount,
  status = 'initiated',
  internalTxnId = null,
  payUrl = null,
  apiResponse = null,
}) {
  const [result] = await connection.query(
    `INSERT INTO winypay_payment_orders
      (transaction_id, user_id, order_type, order_id, pay_type, amount, status, internal_txn_id, pay_url, api_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionId,
      userId,
      orderType,
      orderId,
      payType,
      amount,
      status,
      internalTxnId,
      payUrl,
      apiResponse ? JSON.stringify(apiResponse) : null,
    ],
  );
  return result.insertId;
}

export async function findWinypayOrderByOrderId(connection, orderId, { forUpdate = false } = {}) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const [rows] = await connection.query(
    `SELECT * FROM winypay_payment_orders WHERE order_id = ? LIMIT 1${lock}`,
    [orderId],
  );
  return rows[0] || null;
}

export async function findWinypayOrderByTransactionId(connection, transactionId) {
  const [rows] = await connection.query(
    `SELECT * FROM winypay_payment_orders WHERE transaction_id = ? ORDER BY id DESC LIMIT 1`,
    [transactionId],
  );
  return rows[0] || null;
}

export async function updateWinypayOrder(connection, orderId, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    params.push(value);
  }
  params.push(orderId);
  await connection.query(`UPDATE winypay_payment_orders SET ${sets.join(', ')} WHERE order_id = ?`, params);
}

export async function initiateWinypayDeposit({
  userId,
  amount,
  method,
  transactionId,
  connection = null,
}) {
  const config = assertWinypayConfigured();
  const payType = normalizeWinypayPayType(method);
  const orderId = buildDepositOrderId(userId);
  const payload = {
    merchant_code: config.merchantCode,
    secret_key: config.secretKey,
    order_id: orderId,
    user_id: String(userId),
    amount: formatWinypayAmount(amount),
    pay_type: payType,
    current_time: formatWinypayTime(),
    jump_url: config.jumpUrl,
    callback_url: config.depositCallbackUrl,
  };

  const db = connection || getPool();
  const orderRecordId = await createWinypayOrderRecord(db, {
    transactionId,
    userId,
    orderType: 'deposit',
    orderId,
    payType,
    amount,
    status: 'initiated',
  });

  const { data } = await postWinypayJson(config.depositEndpoint, payload);
  const status = trim(data.status).toLowerCase();
  const payUrl = extractWinypayPayUrl(data);
  const internalTxnId = trim(data.internal_txn_id || data.internalTxnId) || null;

  await updateWinypayOrder(db, orderId, {
    status: status === 'success' && payUrl ? 'awaiting_callback' : 'failed',
    internal_txn_id: internalTxnId,
    pay_url: payUrl || null,
    api_response: JSON.stringify(data),
    callback_message: trim(data.message) || null,
  });

  if (status !== 'success' || !payUrl) {
    const error = new Error(
      status !== 'success'
        ? trim(data.message) || 'WinyPay deposit request failed'
        : 'পেমেন্ট পেজ লিংক পাওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    );
    error.statusCode = 502;
    error.gateway = { orderId, internalTxnId, response: data };
    throw error;
  }

  return {
    mode: 'redirect',
    provider: 'winypay',
    success: true,
    orderId,
    orderRecordId,
    internalTxnId,
    payUrl,
    message: trim(data.message) || 'Deposit forwarded to payment provider',
  };
}

export async function initiateWinypayWithdraw({
  userId,
  amount,
  method,
  accountNumber,
  accountName,
  transactionId,
  connection = null,
}) {
  const config = assertWinypayConfigured();
  const payType = normalizeWinypayPayType(method);
  const orderId = buildWithdrawOrderId(userId);
  const payload = {
    merchant_code: config.merchantCode,
    payout_key: config.payoutKey,
    order_id: orderId,
    user_id: String(userId),
    amount: formatWinypayAmount(amount),
    pay_type: payType,
    account_no: trim(accountNumber),
    account_name: trim(accountName) || `User ${userId}`,
    current_time: formatWinypayTime(),
    callback_url: config.withdrawCallbackUrl,
  };

  const db = connection || getPool();
  await createWinypayOrderRecord(db, {
    transactionId,
    userId,
    orderType: 'withdraw',
    orderId,
    payType,
    amount,
    status: 'initiated',
  });

  const { data } = await postWinypayJson(config.withdrawEndpoint, payload);
  const status = trim(data.status).toLowerCase();
  const internalTxnId = trim(data.internal_txn_id || data.internalTxnId) || null;

  await updateWinypayOrder(db, orderId, {
    status: status === 'success' ? 'awaiting_callback' : 'failed',
    internal_txn_id: internalTxnId,
    api_response: JSON.stringify(data),
    callback_message: trim(data.message) || null,
  });

  if (status !== 'success') {
    const error = new Error(trim(data.message) || 'WinyPay withdrawal request failed');
    error.statusCode = 502;
    error.gateway = { orderId, internalTxnId, response: data };
    throw error;
  }

  return {
    mode: 'gateway',
    provider: 'winypay',
    success: true,
    orderId,
    internalTxnId,
    message: trim(data.message) || 'Withdrawal forwarded to payment provider',
  };
}

export default {
  migrateWinypaySchema,
  getWinypayConfig,
  isWinypayConfigured,
  assertWinypayConfigured,
  initiateWinypayDeposit,
  initiateWinypayWithdraw,
  verifyWinypayCallbackSignature,
  findWinypayOrderByOrderId,
  findWinypayOrderByTransactionId,
};
