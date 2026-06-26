import { getPool } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { validateWithdrawAmount } from './generalSettingsService.js';
import { ensureUserWallet, syncWalletBalance } from './userWalletService.js';
import {
  enforceBonusTurnoverForWithdraw,
  enforceTurnoverForWithdraw,
} from './withdrawEligibilityService.js';
import { processAgentCommission } from './agentCommissionService.js';
import { sendOtpMessage } from './smsApiSettingsService.js';
import { getSmsSettingsInternal } from './smsApiSettingsService.js';
import { isPlayerWithdrawBlocked } from './playerWithdrawGuardService.js';

export const PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS = 15 * 60 * 1000;

export function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export function normalizeAgentUid(value) {
  return String(value || '').trim().toUpperCase();
}

export async function resolveActiveAgentByUid(uid, connection = null) {
  const db = connection || getPool();
  const normalizedUid = normalizeAgentUid(uid);

  if (!normalizedUid) {
    const error = new Error('Agent UID is required');
    error.statusCode = 400;
    throw error;
  }

  const [[agent]] = await db.query(
    `SELECT id, uid, name, status FROM agents WHERE uid = ? LIMIT 1`,
    [normalizedUid],
  );

  if (!agent) {
    const error = new Error('Agent UID not found');
    error.statusCode = 400;
    throw error;
  }

  if (agent.status !== 'active') {
    const error = new Error('Agent is not available');
    error.statusCode = 400;
    throw error;
  }

  return agent;
}

export async function cancelPendingPlayerAgentWithdrawRequests(connection, userId) {
  await connection.query(
    `UPDATE player_agent_withdraw_requests
     SET status = 'cancelled', otp_code = NULL
     WHERE user_id = ? AND status = 'pending'`,
    [userId],
  );
}

export async function validatePlayerCanWithdraw(connection, userId, amount) {
  await validateWithdrawAmount(amount);
  await ensureUserWallet(userId);

  const [[user]] = await connection.query(
    `SELECT id, phone, balance FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (await isPlayerWithdrawBlocked(userId, connection)) {
    const error = new Error('Your withdrawal has been blocked. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  if (Number(user.balance) < amount) {
    const error = new Error('Insufficient balance');
    error.statusCode = 400;
    throw error;
  }

  const [[wallet]] = await connection.query(
    `SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id = ? FOR UPDATE`,
    [userId],
  );

  await enforceTurnoverForWithdraw(wallet);
  await enforceBonusTurnoverForWithdraw(userId, connection);

  return user;
}

export async function createPlayerAgentWithdrawRequest(connection, { userId, agentId, amount }) {
  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const expiresAt = new Date(Date.now() + PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS);

  await cancelPendingPlayerAgentWithdrawRequests(connection, userId);

  const [result] = await connection.query(
    `INSERT INTO player_agent_withdraw_requests
      (user_id, agent_id, amount, otp_hash, otp_code, status, expires_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [userId, agentId, amount, otpHash, otp, expiresAt],
  );

  return {
    requestId: result.insertId,
    otp,
    expiresAt,
  };
}

export async function listPendingPlayerAgentWithdrawRequestsForAgent(agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.amount,
       r.status,
       r.expires_at AS expiresAt,
       r.created_at AS createdAt,
       u.name AS playerName,
       u.phone AS playerPhone
     FROM player_agent_withdraw_requests r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.agent_id = ?
       AND r.status = 'pending'
       AND r.expires_at > NOW()
     ORDER BY r.created_at DESC
     LIMIT 20`,
    [agentId],
  );

  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    playerName: row.playerName,
    playerPhone: row.playerPhone,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

export async function expireStalePlayerAgentWithdrawRequests(connection = null) {
  const db = connection || getPool();
  await db.query(
    `UPDATE player_agent_withdraw_requests
     SET status = 'expired', otp_code = NULL
     WHERE status = 'pending' AND expires_at <= NOW()`,
  );
}

export async function listPlayerAgentWithdrawRequests(userId) {
  await expireStalePlayerAgentWithdrawRequests();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.amount,
       r.status,
       r.otp_code AS otp,
       r.expires_at AS expiresAt,
       r.completed_at AS completedAt,
       r.created_at AS createdAt,
       a.uid AS agentUid,
       a.name AS agentName
     FROM player_agent_withdraw_requests r
     INNER JOIN agents a ON a.id = r.agent_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC
     LIMIT 30`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    otp: row.status === 'pending' && new Date(row.expiresAt) > new Date() ? row.otp : null,
    agentUid: row.agentUid,
    agentName: row.agentName,
    expiresAt: row.expiresAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
  }));
}

export async function findPendingRequestByOtpForAgent(connection, agentId, otp) {
  const trimmedOtp = String(otp || '').trim();
  if (!/^\d{6}$/.test(trimmedOtp)) {
    const error = new Error('Valid 6-digit OTP is required');
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await connection.query(
    `SELECT
       r.id,
       r.user_id,
       r.amount,
       r.otp_hash,
       r.expires_at,
       u.name AS playerName,
       u.balance AS playerBalance
     FROM player_agent_withdraw_requests r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.agent_id = ?
       AND r.status = 'pending'
       AND r.expires_at > NOW()
     ORDER BY r.created_at DESC
     FOR UPDATE`,
    [agentId],
  );

  for (const row of rows) {
    const valid = await comparePassword(trimmedOtp, row.otp_hash);
    if (valid) {
      return row;
    }
  }

  const error = new Error('Invalid or expired OTP');
  error.statusCode = 400;
  throw error;
}

export async function completePlayerAgentWithdraw(connection, { requestRow, agentId }) {
  const userId = Number(requestRow.user_id);
  const amount = Number(requestRow.amount);

  const [[player]] = await connection.query(
    `SELECT id, name, balance FROM users WHERE id = ? FOR UPDATE`,
    [userId],
  );

  if (!player) {
    const error = new Error('Player not found');
    error.statusCode = 404;
    throw error;
  }

  if (Number(player.balance) < amount) {
    const error = new Error('Insufficient player balance');
    error.statusCode = 400;
    throw error;
  }

  await connection.query(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, userId]);

  await connection.query(`UPDATE agents SET balance = balance + ? WHERE id = ?`, [amount, agentId]);

  const [agentTxResult] = await connection.query(
    `INSERT INTO agent_transactions (agent_id, user_id, type, amount, status)
     VALUES (?, ?, 'withdraw', ?, 'completed')`,
    [agentId, userId, amount],
  );

  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'withdraw', ?, 'approved', 'agent', NOW())`,
    [userId, amount],
  );

  await connection.query(
    `UPDATE player_agent_withdraw_requests
     SET status = 'completed', completed_at = NOW(), otp_code = NULL
     WHERE id = ?`,
    [requestRow.id],
  );

  await processAgentCommission(connection, agentTxResult.insertId);

  const [[updatedAgent]] = await connection.query(
    `SELECT balance FROM agents WHERE id = ?`,
    [agentId],
  );

  return {
    playerName: player.name,
    amount,
    newAgentBalance: Number(updatedAgent.balance),
    playerNewBalance: Number(player.balance) - amount,
  };
}

export async function sendPlayerAgentWithdrawOtpSms({ user, otp, amount }) {
  if (!user?.phone) {
    return { isDemo: false, smsResult: null, smsSkipped: true };
  }

  try {
    const settings = await getSmsSettingsInternal();
    const smsResult = await sendOtpMessage({
      mobile: user.phone,
      otp,
      purpose: 'withdraw',
      amount,
      minutes: PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS / 60000,
    });

    const isDemo = settings.apiMode === 'demo' || Boolean(smsResult?.demo);
    return { isDemo, smsResult, smsSkipped: false };
  } catch (error) {
    console.error('Player agent withdraw SMS failed:', error.message);
    return { isDemo: false, smsResult: null, smsSkipped: false, smsFailed: true };
  }
}

export async function syncPlayerWalletAfterWithdraw(userId) {
  await syncWalletBalance(userId);
}

export default {
  PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS,
  createPlayerAgentWithdrawRequest,
  listPlayerAgentWithdrawRequests,
  completePlayerAgentWithdraw,
  findPendingRequestByOtpForAgent,
  resolveActiveAgentByUid,
  validatePlayerCanWithdraw,
  sendPlayerAgentWithdrawOtpSms,
  syncPlayerWalletAfterWithdraw,
};
