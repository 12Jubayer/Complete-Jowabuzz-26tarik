import { getPool } from '../config/db.js';

function getAgentId(req) {
  return Number(req.agent?.sub);
}

async function fetchAgentById(agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, uid, name, mobile, balance, commission_balance, status
     FROM agents
     WHERE id = ?
     LIMIT 1`,
    [agentId],
  );
  return rows[0] ?? null;
}

async function fetchAgentPlayerTotals(agentId) {
  const pool = getPool();

  const [[{ totalDeposit }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalDeposit
     FROM agent_transactions
     WHERE agent_id = ?
       AND user_id IS NOT NULL
       AND type IN ('topup_player', 'deposit')
       AND status IN ('approved', 'completed')`,
    [agentId],
  );

  const [[{ totalTopup }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalTopup
     FROM agent_transactions
     WHERE agent_id = ?
       AND user_id IS NOT NULL
       AND type = 'topup_player'
       AND status IN ('approved', 'completed')`,
    [agentId],
  );

  const [[{ totalWithdraw }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalWithdraw
     FROM agent_transactions
     WHERE agent_id = ?
       AND user_id IS NOT NULL
       AND type = 'withdraw'
       AND status IN ('approved', 'completed')`,
    [agentId],
  );

  const deposit = Number(totalDeposit);
  const topup = Number(totalTopup);
  const withdraw = Number(totalWithdraw);

  return {
    totalDeposit: deposit,
    totalTopup: topup,
    totalWithdraw: withdraw,
    lifetimeBalance: deposit - withdraw,
    volumeBalance: deposit + withdraw,
  };
}

export async function getAgentMe(req, res) {
  try {
    const agent = await fetchAgentById(getAgentId(req));

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({
      id: agent.id,
      uid: agent.uid,
      name: agent.name,
      mobile: agent.mobile,
      balance: Number(agent.balance),
      status: agent.status,
    });
  } catch (error) {
    console.error('Agent me error:', error);
    return res.status(500).json({ error: 'Failed to fetch agent profile' });
  }
}

export async function getAgentDashboard(req, res) {
  try {
    const agentId = getAgentId(req);
    const agent = await fetchAgentById(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const totals = await fetchAgentPlayerTotals(agentId);
    const walletBalance = Number(agent.balance);

    return res.json({
      uid: agent.uid,
      name: agent.name,
      mobile: agent.mobile,
      balance: walletBalance,
      displayBalance: walletBalance,
      volumeBalance: walletBalance,
      commissionBalance: Number(agent.commission_balance || 0),
      totalDeposit: totals.totalDeposit,
      totalTopup: totals.totalTopup,
      totalWithdraw: totals.totalWithdraw,
      lifetimeBalance: totals.lifetimeBalance,
    });
  } catch (error) {
    console.error('Agent dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

export default getAgentDashboard;
