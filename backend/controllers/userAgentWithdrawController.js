import { getPool } from '../config/db.js';
import { maskPhone } from '../services/otpService.js';
import {
  PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS,
  createPlayerAgentWithdrawRequest,
  listPlayerAgentWithdrawRequests,
  resolveActiveAgentByUid,
  sendPlayerAgentWithdrawOtpSms,
  validatePlayerCanWithdraw,
} from '../services/playerAgentWithdrawService.js';
import { assertPlayerCanWithdraw } from '../services/playerWithdrawGuardService.js';
import { assertWithdrawChannelForAgent } from '../services/withdrawChannelService.js';

function getUserId(req) {
  return Number(req.user?.sub);
}

async function ensureActivePlayerAccount(userId, res) {
  const pool = getPool();
  const [[user]] = await pool.query(`SELECT status FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!user || user.status === 'deleted') {
    res.status(403).json({ error: 'Account is not available' });
    return false;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended' });
    return false;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return false;
  }
  return true;
}

export async function requestPlayerAgentWithdrawOtp(req, res) {
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;
  if (!(await assertPlayerCanWithdraw(userId, res))) return;

  const amount = Number(req.body.amount);
  const agentUid = String(req.body.agentUid || req.body.agent_uid || '').trim();

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  if (!agentUid) {
    return res.status(400).json({ error: 'Agent UID is required' });
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const agent = await resolveActiveAgentByUid(agentUid, connection);
    await assertWithdrawChannelForAgent(connection, userId);
    const user = await validatePlayerCanWithdraw(connection, userId, amount);
    const { requestId, otp } = await createPlayerAgentWithdrawRequest(connection, {
      userId,
      agentId: agent.id,
      amount,
    });

    await connection.commit();

    let smsMeta = { isDemo: false, smsFailed: false, smsSkipped: true };
    try {
      smsMeta = await sendPlayerAgentWithdrawOtpSms({
        user,
        otp,
        amount,
      });
    } catch (smsError) {
      console.error('Player agent withdraw SMS error:', smsError);
      smsMeta = { isDemo: false, smsFailed: true, smsSkipped: false };
    }

    return res.json({
      success: true,
      message: 'Withdraw OTP generated successfully',
      requestId,
      otp,
      expiresIn: PLAYER_AGENT_WITHDRAW_OTP_EXPIRY_MS / 1000,
      maskedPhone: user.phone ? maskPhone(user.phone) : null,
      agentUid: agent.uid,
      agentName: agent.name,
      amount,
      smsSent: !smsMeta.smsFailed && !smsMeta.smsSkipped,
      ...(smsMeta.isDemo ? { demoOtp: otp } : {}),
    });
  } catch (error) {
    await connection.rollback();
    console.error('Request player agent withdraw OTP error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to generate withdraw OTP',
    });
  } finally {
    connection.release();
  }
}

export async function getPlayerAgentWithdrawRequests(req, res) {
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;

  try {
    const requests = await listPlayerAgentWithdrawRequests(userId);
    return res.json({ requests });
  } catch (error) {
    console.error('List player agent withdraw requests error:', error);
    return res.status(500).json({ error: 'Failed to load withdraw OTP history' });
  }
}

export default {
  requestPlayerAgentWithdrawOtp,
  getPlayerAgentWithdrawRequests,
};
