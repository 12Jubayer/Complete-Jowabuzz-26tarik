import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
  shouldUpdateSecret,
} from '../utils/secretCrypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_SMS_SETTINGS = {
  providerName: 'Bulk SMS API',
  apiMode: 'demo',
  apiBaseUrl: '',
  apiToken: '',
  senderId: '',
  defaultCountryCode: '+880',
  otpTemplate: 'Your JowaBuzz OTP is {otp}. Valid for {minutes} minutes.',
  promotionalTemplate: '{message}',
  isActive: false,
};

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function normalizeApiMode(value) {
  const mode = String(value || 'demo').trim().toLowerCase();
  if (mode !== 'demo' && mode !== 'production') {
    const error = new Error('API mode must be demo or production');
    error.statusCode = 400;
    throw error;
  }
  return mode;
}

function mapRow(row, { masked = true } = {}) {
  if (!row) return { ...DEFAULT_SMS_SETTINGS };

  const decryptedToken = decryptSecret(row.api_token || '');

  return {
    id: row.id,
    providerName: row.provider_name || DEFAULT_SMS_SETTINGS.providerName,
    apiMode: row.api_mode || 'demo',
    apiBaseUrl: row.api_base_url || '',
    apiToken: masked ? maskSecret(decryptedToken) : decryptedToken,
    apiTokenConfigured: Boolean(decryptedToken),
    senderId: row.sender_id || '',
    defaultCountryCode: row.default_country_code || '+880',
    otpTemplate: row.otp_template || DEFAULT_SMS_SETTINGS.otpTemplate,
    promotionalTemplate: row.promotional_template || DEFAULT_SMS_SETTINGS.promotionalTemplate,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSettingsRow(db) {
  const [[row]] = await db.query(`SELECT * FROM sms_api_settings ORDER BY id ASC LIMIT 1`);
  if (row) return row;

  await db.query(
    `INSERT INTO sms_api_settings (
       provider_name, api_mode, api_base_url, api_token, sender_id,
       default_country_code, otp_template, promotional_template, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_SMS_SETTINGS.providerName,
      DEFAULT_SMS_SETTINGS.apiMode,
      DEFAULT_SMS_SETTINGS.apiBaseUrl,
      '',
      DEFAULT_SMS_SETTINGS.senderId,
      DEFAULT_SMS_SETTINGS.defaultCountryCode,
      DEFAULT_SMS_SETTINGS.otpTemplate,
      DEFAULT_SMS_SETTINGS.promotionalTemplate,
      0,
    ],
  );

  const [[created]] = await db.query(`SELECT * FROM sms_api_settings ORDER BY id DESC LIMIT 1`);
  return created;
}

export async function migrateSmsApiSettingsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'sms_api_settings.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(sql)) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (statement.includes('user_otps') && error.code === 'ER_FK_INCOMPATIBLE_COLUMNS') {
        await pool.query('DROP TABLE IF EXISTS user_otps');
        await pool.query(statement);
        continue;
      }
      throw error;
    }
  }
  await getSettingsRow(pool);
}

export async function isSmsProviderActive() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return Boolean(row.is_active);
}

export async function getSmsSettingsForAdmin() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return mapRow(row, { masked: true });
}

export async function getSmsSettingsInternal() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return mapRow(row, { masked: false });
}

function normalizeSettingsPayload(payload = {}, existing = null) {
  const current = existing ? mapRow(existing, { masked: false }) : DEFAULT_SMS_SETTINGS;
  const decryptedExisting = decryptSecret(existing?.api_token || '');

  const apiToken = shouldUpdateSecret(payload.apiToken ?? payload.api_token, decryptedExisting)
    ? String(payload.apiToken ?? payload.api_token).trim()
    : decryptedExisting;

  return {
    providerName: String(payload.providerName ?? payload.provider_name ?? current.providerName).trim(),
    apiMode: normalizeApiMode(payload.apiMode ?? payload.api_mode ?? current.apiMode),
    apiBaseUrl: String(payload.apiBaseUrl ?? payload.api_base_url ?? current.apiBaseUrl).trim(),
    apiToken,
    senderId: String(payload.senderId ?? payload.sender_id ?? current.senderId).trim(),
    defaultCountryCode: String(
      payload.defaultCountryCode ?? payload.default_country_code ?? current.defaultCountryCode,
    ).trim() || '+880',
    otpTemplate: String(payload.otpTemplate ?? payload.otp_template ?? current.otpTemplate).trim(),
    promotionalTemplate: String(
      payload.promotionalTemplate ?? payload.promotional_template ?? current.promotionalTemplate,
    ).trim(),
    isActive:
      payload.isActive !== undefined || payload.is_active !== undefined
        ? Boolean(payload.isActive ?? payload.is_active)
        : current.isActive,
  };
}

export async function updateSmsSettings(payload = {}) {
  const pool = getPool();
  const existing = await getSettingsRow(pool);
  const normalized = normalizeSettingsPayload(payload, existing);

  if (!normalized.providerName) {
    const error = new Error('Provider name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!normalized.otpTemplate.includes('{otp}')) {
    const error = new Error('OTP template must include {otp} placeholder');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `UPDATE sms_api_settings SET
       provider_name = ?,
       api_mode = ?,
       api_base_url = ?,
       api_token = ?,
       sender_id = ?,
       default_country_code = ?,
       otp_template = ?,
       promotional_template = ?,
       is_active = ?
     WHERE id = ?`,
    [
      normalized.providerName,
      normalized.apiMode,
      normalized.apiBaseUrl,
      encryptSecret(normalized.apiToken),
      normalized.senderId,
      normalized.defaultCountryCode,
      normalized.otpTemplate,
      normalized.promotionalTemplate,
      normalized.isActive ? 1 : 0,
      existing.id,
    ],
  );

  return getSmsSettingsForAdmin();
}

export async function setSmsProviderStatus(active) {
  return updateSmsSettings({ isActive: Boolean(active) });
}

export function formatMobileNumber(phone, defaultCountryCode = '+880') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('880')) return `+${digits}`;

  const codeDigits = String(defaultCountryCode || '+880').replace(/\D/g, '');
  if (codeDigits && digits.startsWith(codeDigits)) return `+${digits}`;

  if (digits.startsWith('0')) {
    return `+${codeDigits}${digits.slice(1)}`;
  }

  return `+${codeDigits}${digits}`;
}

export function renderTemplate(template, variables = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => {
    if (variables[key] === undefined || variables[key] === null) return `{${key}}`;
    return String(variables[key]);
  });
}

export async function insertSmsLog(connectionOrPool, {
  smsType,
  purpose,
  recipient,
  message,
  requestPayload,
  responsePayload,
  status,
  errorMessage,
}) {
  const db = connectionOrPool;
  await db.query(
    `INSERT INTO sms_api_logs
       (sms_type, purpose, recipient, message, request_payload, response_payload, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      smsType || 'transactional',
      purpose || null,
      recipient,
      message,
      requestPayload ? JSON.stringify(requestPayload) : null,
      responsePayload ? JSON.stringify(responsePayload) : null,
      status || 'pending',
      errorMessage || null,
    ],
  );
}

export async function listSmsLogs({ search = '', limit = 100 } = {}) {
  const pool = getPool();
  const filters = [];
  const params = [];

  const term = String(search || '').trim();
  if (term) {
    filters.push(`(recipient LIKE ? OR purpose LIKE ? OR message LIKE ? OR status LIKE ?)`);
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const [rows] = await pool.query(
    `SELECT id, sms_type, purpose, recipient, message, status, error_message, created_at
     FROM sms_api_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`,
    [...params, safeLimit],
  );

  return rows.map((row) => ({
    id: row.id,
    smsType: row.sms_type,
    purpose: row.purpose,
    recipient: row.recipient,
    message: row.message,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));
}

async function callSmsProvider(settings, { mobile, message, smsType, purpose }) {
  const recipient = formatMobileNumber(mobile, settings.defaultCountryCode);
  if (!recipient) {
    const error = new Error('Valid mobile number is required');
    error.statusCode = 400;
    throw error;
  }

  const requestPayload = {
    sender_id: settings.senderId,
    to: recipient,
    recipient,
    message,
    type: smsType || 'text',
    country_code: settings.defaultCountryCode,
  };

  if (settings.apiMode === 'demo') {
    await insertSmsLog(getPool(), {
      smsType: smsType || 'transactional',
      purpose,
      recipient,
      message,
      requestPayload: { ...requestPayload, mode: 'demo' },
      responsePayload: { success: true, demo: true },
      status: 'demo',
    });

    return {
      sent: true,
      demo: true,
      recipient,
      message: 'SMS logged in demo mode',
      response: { success: true, demo: true },
    };
  }

  if (!settings.isActive) {
    const error = new Error('SMS provider is disabled');
    error.statusCode = 503;
    throw error;
  }

  if (!settings.apiBaseUrl) {
    const error = new Error('API base URL is required');
    error.statusCode = 400;
    throw error;
  }

  if (!settings.apiToken) {
    const error = new Error('API token is required');
    error.statusCode = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(settings.apiBaseUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiToken}`,
        'X-Api-Token': settings.apiToken,
      },
      body: JSON.stringify({
        ...requestPayload,
        api_token: settings.apiToken,
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let responsePayload = null;

    if (contentType.includes('application/json')) {
      responsePayload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      responsePayload = text ? { message: text.slice(0, 500) } : null;
    }

    const success = response.ok;

    await insertSmsLog(getPool(), {
      smsType: smsType || 'transactional',
      purpose,
      recipient,
      message,
      requestPayload: { ...requestPayload, api_token: maskSecret(settings.apiToken) },
      responsePayload,
      status: success ? 'sent' : 'failed',
      errorMessage: success ? null : `HTTP ${response.status}`,
    });

    if (!success) {
      const error = new Error(responsePayload?.message || `SMS API responded with HTTP ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    return {
      sent: true,
      demo: false,
      recipient,
      message: 'SMS sent successfully',
      response: responsePayload,
    };
  } catch (error) {
    if (error.statusCode) throw error;

    await insertSmsLog(getPool(), {
      smsType: smsType || 'transactional',
      purpose,
      recipient,
      message,
      requestPayload: { ...requestPayload, api_token: maskSecret(settings.apiToken) },
      responsePayload: null,
      status: 'failed',
      errorMessage: error.message || 'SMS request failed',
    });

    const wrapped = new Error(error.message || 'SMS request failed');
    wrapped.statusCode = 502;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendSmsMessage({
  mobile,
  message,
  smsType = 'transactional',
  purpose = 'general',
}) {
  const settings = await getSmsSettingsInternal();
  return callSmsProvider(settings, { mobile, message, smsType, purpose });
}

export async function sendOtpMessage({
  mobile,
  otp,
  purpose = 'otp',
  amount,
  minutes = 5,
}) {
  const settings = await getSmsSettingsInternal();
  const message = renderTemplate(settings.otpTemplate, {
    otp,
    purpose,
    amount: amount !== undefined ? Number(amount).toFixed(2) : '',
    minutes,
  });

  return callSmsProvider(settings, {
    mobile,
    message,
    smsType: 'otp',
    purpose,
  });
}

export async function sendPromotionalMessage({ mobile, message }) {
  const settings = await getSmsSettingsInternal();
  const body = renderTemplate(settings.promotionalTemplate, { message });
  return callSmsProvider(settings, {
    mobile,
    message: body,
    smsType: 'promotional',
    purpose: 'promotional',
  });
}

export async function sendBulkPromotionalSms({ mobiles = [], message }) {
  const list = [...new Set(mobiles.map((item) => String(item || '').trim()).filter(Boolean))];
  if (!list.length) {
    const error = new Error('At least one mobile number is required');
    error.statusCode = 400;
    throw error;
  }

  if (!String(message || '').trim()) {
    const error = new Error('Message is required');
    error.statusCode = 400;
    throw error;
  }

  const results = [];
  for (const mobile of list) {
    try {
      const result = await sendPromotionalMessage({ mobile, message });
      results.push({ mobile, success: true, ...result });
    } catch (error) {
      results.push({ mobile, success: false, error: error.message });
    }
  }

  return {
    total: list.length,
    sent: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

export async function testSmsConnection({ mobile, message }) {
  const settings = await getSmsSettingsInternal();
  const recipient = String(mobile || '').trim();

  if (!recipient) {
    const error = new Error('Test mobile number is required');
    error.statusCode = 400;
    throw error;
  }

  const testMessage =
    String(message || '').trim() ||
    renderTemplate(settings.otpTemplate, {
      otp: '123456',
      purpose: 'test',
      amount: '100.00',
      minutes: 5,
    });

  const result = await callSmsProvider(settings, {
    mobile: recipient,
    message: testMessage,
    smsType: 'test',
    purpose: 'test_sms',
  });

  return {
    success: true,
    message: result.demo ? 'Test SMS logged in demo mode' : 'Test SMS sent successfully',
    result,
  };
}

export default {
  migrateSmsApiSettingsSchema,
  isSmsProviderActive,
  getSmsSettingsForAdmin,
  getSmsSettingsInternal,
  updateSmsSettings,
  setSmsProviderStatus,
  formatMobileNumber,
  renderTemplate,
  insertSmsLog,
  listSmsLogs,
  sendSmsMessage,
  sendOtpMessage,
  sendPromotionalMessage,
  sendBulkPromotionalSms,
  testSmsConnection,
};
