import { getPool } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { sendOtpSms } from '../services/smsService.js';
import { getSmsSettingsInternal } from '../services/smsApiSettingsService.js';
import { ensureActiveAgentAccount } from '../services/adminAgentService.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_PURPOSE = 'withdraw';

function getAgentId(req) {
  return Number(req.agent?.sub);
}

function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function requestWithdrawOtp(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const amount = Number(req.body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  try {
    const [[agent]] = await pool.query(
      `SELECT id, mobile, balance, uid FROM agents WHERE id = ? LIMIT 1`,
      [agentId],
    );

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (Number(agent.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await pool.query(
      `UPDATE agent_otps SET used_at = NOW()
       WHERE agent_id = ? AND purpose = ? AND used_at IS NULL`,
      [agentId, OTP_PURPOSE],
    );

    const otp = generateOtp();
    const otpHash = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await pool.query(
      `INSERT INTO agent_otps (agent_id, otp_hash, purpose, amount, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [agentId, otpHash, OTP_PURPOSE, amount, expiresAt],
    );

    const smsResult = await sendOtpSms({
      mobile: agent.mobile,
      otp,
      purpose: OTP_PURPOSE,
      amount,
    });

    const settings = await getSmsSettingsInternal();
    const isDemo = settings.apiMode === 'demo' || smsResult.demo;

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MS / 1000,
      uid: agent.uid,
      ...(isDemo ? { demoOtp: otp } : {}),
    });
  } catch (error) {
    console.error('Request withdraw OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}

export async function confirmWithdraw(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const amount = Number(req.body.amount);
  const otp = String(req.body.otp || '').trim();

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [otpRows] = await connection.query(
      `SELECT id, otp_hash, amount, expires_at, used_at
       FROM agent_otps
       WHERE agent_id = ? AND purpose = ?
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [agentId, OTP_PURPOSE],
    );

    if (!otpRows.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const otpRecord = otpRows[0];

    if (otpRecord.used_at) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await connection.rollback();
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (Number(otpRecord.amount) !== amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Amount mismatch. Please restart withdraw.' });
    }

    const validOtp = await comparePassword(otp, otpRecord.otp_hash);

    if (!validOtp) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const [[agent]] = await connection.query(
      `SELECT id, balance FROM agents WHERE id = ? FOR UPDATE`,
      [agentId],
    );

    if (!agent) {
      await connection.rollback();
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (Number(agent.balance) < amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await connection.query(`UPDATE agents SET balance = balance - ? WHERE id = ?`, [
      amount,
      agentId,
    ]);

    await connection.query(
      `INSERT INTO agent_transactions (agent_id, user_id, type, amount, status)
       VALUES (?, NULL, 'withdraw', ?, 'completed')`,
      [agentId, amount],
    );

    await connection.query(`UPDATE agent_otps SET used_at = NOW() WHERE id = ?`, [
      otpRecord.id,
    ]);

    await connection.commit();

    const [[updatedAgent]] = await pool.query(`SELECT balance FROM agents WHERE id = ?`, [
      agentId,
    ]);

    return res.json({
      success: true,
      message: 'Withdraw successful',
      agentNewBalance: Number(updatedAgent.balance),
    });
  } catch (error) {
    await connection.rollback();
    console.error('Confirm withdraw error:', error);
    return res.status(500).json({ error: 'Failed to process withdraw' });
  } finally {
    connection.release();
  }
}

export default requestWithdrawOtp;
