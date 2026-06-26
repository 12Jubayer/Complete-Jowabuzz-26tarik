import crypto from 'crypto';
import { getPool } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { sendOtpMessage } from './smsApiSettingsService.js';

export const OTP_EXPIRY_MS = 5 * 60 * 1000;

export function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export function normalizeIdentifier(value) {
  return String(value || '').trim();
}

export function normalizePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function maskPhone(phone) {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 4) return '****';
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export async function invalidatePendingOtps(connection, { userId, identifier, purpose }) {
  if (userId) {
    await connection.query(
      `UPDATE user_otps SET used_at = NOW()
       WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
      [userId, purpose],
    );
    return;
  }

  await connection.query(
    `UPDATE user_otps SET used_at = NOW()
     WHERE identifier = ? AND purpose = ? AND used_at IS NULL`,
    [identifier, purpose],
  );
}

export async function createUserOtp(connection, {
  userId = null,
  identifier,
  purpose,
  amount = null,
}) {
  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await invalidatePendingOtps(connection, { userId, identifier, purpose });

  await connection.query(
    `INSERT INTO user_otps (user_id, identifier, otp_hash, purpose, amount, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, identifier, otpHash, purpose, amount, expiresAt],
  );

  return { otp, expiresAt };
}

export async function verifyUserOtp(connection, {
  identifier,
  purpose,
  otp,
  amount = null,
}) {
  const trimmedOtp = String(otp || '').trim();
  if (!/^\d{6}$/.test(trimmedOtp)) {
    const error = new Error('OTP must be 6 digits');
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await connection.query(
    `SELECT id, otp_hash, amount, expires_at, used_at
     FROM user_otps
     WHERE identifier = ? AND purpose = ?
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [identifier, purpose],
  );

  if (!rows.length) {
    const error = new Error('OTP not found. Please request a new one.');
    error.statusCode = 400;
    throw error;
  }

  const record = rows[0];

  if (record.used_at) {
    const error = new Error('OTP already used');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(record.expires_at) < new Date()) {
    const error = new Error('OTP expired. Please request a new one.');
    error.statusCode = 400;
    throw error;
  }

  if (amount !== null && Number(record.amount) !== Number(amount)) {
    const error = new Error('Amount mismatch. Please restart the process.');
    error.statusCode = 400;
    throw error;
  }

  const valid = await comparePassword(trimmedOtp, record.otp_hash);
  if (!valid) {
    const error = new Error('Invalid OTP');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(`UPDATE user_otps SET used_at = NOW() WHERE id = ?`, [record.id]);

  return record;
}

export async function sendUserOtpSms({ mobile, otp, purpose, amount }) {
  const result = await sendOtpMessage({
    mobile,
    otp,
    purpose,
    amount,
    minutes: OTP_EXPIRY_MS / 60000,
  });

  return {
    ...result,
    demo: Boolean(result.demo),
  };
}

export function buildOtpIdentifier(user) {
  return String(user?.phone || user?.name || user?.id || '').trim();
}

export default {
  OTP_EXPIRY_MS,
  generateOtp,
  normalizeIdentifier,
  normalizePhoneDigits,
  maskPhone,
  invalidatePendingOtps,
  createUserOtp,
  verifyUserOtp,
  sendUserOtpSms,
  buildOtpIdentifier,
};
