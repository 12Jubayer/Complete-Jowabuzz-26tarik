import { getPool } from '../config/db.js';
import { ensureActiveAgentAccount } from '../services/adminAgentService.js';

function getAgentId(req) {
  return Number(req.agent?.sub);
}

function formatTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

export async function getAgentTransactions(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);

  try {
    const [rows] = await pool.query(
      `SELECT id, type, amount, status, created_at, approved_at
       FROM agent_transactions
       WHERE agent_id = ?
       ORDER BY created_at DESC`,
      [agentId],
    );

    return res.json({
      transactions: rows.map(formatTransaction),
    });
  } catch (error) {
    console.error('Agent transactions error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

export async function createTopupRequest(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const amount = Number(req.body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO agent_transactions (agent_id, type, amount, status)
       VALUES (?, 'deposit', ?, 'pending')`,
      [agentId, amount],
    );

    const [rows] = await pool.query(
      `SELECT id, type, amount, status, created_at, approved_at
       FROM agent_transactions
       WHERE id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: 'Top up request submitted',
      transaction: formatTransaction(rows[0]),
    });
  } catch (error) {
    console.error('Top up request error:', error);
    return res.status(500).json({ error: 'Failed to submit top up request' });
  }
}

export async function createWithdrawRequest(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const amount = Number(req.body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[agent]] = await connection.query(
      `SELECT balance FROM agents WHERE id = ? FOR UPDATE`,
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

    const [result] = await connection.query(
      `INSERT INTO agent_transactions (agent_id, type, amount, status)
       VALUES (?, 'withdraw', ?, 'pending')`,
      [agentId, amount],
    );

    await connection.commit();

    const [rows] = await pool.query(
      `SELECT id, type, amount, status, created_at, approved_at
       FROM agent_transactions
       WHERE id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: 'Withdraw request submitted',
      transaction: formatTransaction(rows[0]),
    });
  } catch (error) {
    await connection.rollback();
    console.error('Withdraw request error:', error);
    return res.status(500).json({ error: 'Failed to submit withdraw request' });
  } finally {
    connection.release();
  }
}

export default getAgentTransactions;
