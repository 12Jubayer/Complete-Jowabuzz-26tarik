import { getPool } from '../config/db.js';
import { ensureActiveAgentAccount } from '../services/adminAgentService.js';
import {
  completePlayerAgentWithdraw,
  findPendingRequestByOtpForAgent,
  listPendingPlayerAgentWithdrawRequestsForAgent,
  syncPlayerWalletAfterWithdraw,
  expireStalePlayerAgentWithdrawRequests,
} from '../services/playerAgentWithdrawService.js';

function getAgentId(req) {
  return Number(req.agent?.sub);
}

export async function confirmPlayerWithdrawByOtp(req, res) {
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;

  const otp = String(req.body.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: 'Valid 6-digit OTP is required' });
  }

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await expireStalePlayerAgentWithdrawRequests(connection);

    const requestRow = await findPendingRequestByOtpForAgent(connection, agentId, otp);
    const result = await completePlayerAgentWithdraw(connection, { requestRow, agentId });

    await connection.commit();
    await syncPlayerWalletAfterWithdraw(requestRow.user_id);

    return res.json({
      success: true,
      message: `Withdrawn ৳${result.amount} from ${result.playerName}`,
      amount: result.amount,
      playerName: result.playerName,
      playerNewBalance: result.playerNewBalance,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Confirm player withdraw by OTP error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to process withdraw',
    });
  } finally {
    connection.release();
  }
}

export async function getPendingPlayerWithdrawRequests(req, res) {
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;

  try {
    await expireStalePlayerAgentWithdrawRequests();
    const requests = await listPendingPlayerAgentWithdrawRequestsForAgent(agentId);
    return res.json({ requests });
  } catch (error) {
    console.error('List pending player withdraw requests error:', error);
    return res.status(500).json({ error: 'Failed to load pending withdraw requests' });
  }
}

export default confirmPlayerWithdrawByOtp;
