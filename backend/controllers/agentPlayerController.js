import { getPool } from '../config/db.js';
import { addRequiredTurnover, syncWalletBalance } from '../services/userWalletService.js';
import { ensureActiveAgentAccount } from '../services/adminAgentService.js';
import { processAgentCommission } from '../services/agentCommissionService.js';
import {
  finalizeDepositBalanceBonusNotification,
  processDepositBalanceBonus,
} from '../services/depositBonusService.js';
import {
  setWithdrawChannelOnFirstDeposit,
  WITHDRAW_CHANNEL,
} from '../services/withdrawChannelService.js';

function getAgentId(req) {
  return Number(req.agent?.sub);
}

function formatPlayer(row) {
  const phone = row.phone || '';
  const providerUsername = String(row.provider_username || '').trim();
  return {
    id: row.id,
    name: row.name,
    phone,
    email: row.email,
    balance: Number(row.balance),
    providerUsername,
    identifier: providerUsername || row.email || `${phone}@phone.jowabuzz.app`,
  };
}

export async function searchPlayers(req, res) {
  const pool = getPool();
  const query = String(req.query.q || '').trim();

  if (!query) {
    return res.json({ players: [] });
  }

  if (!/^\d+$/.test(query)) {
    return res.json({ players: [] });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, email, balance, provider_username
       FROM users
       WHERE role = 'user'
         AND status = 'active'
         AND provider_username = ?
       LIMIT 1`,
      [query],
    );

    return res.json({
      players: rows.map(formatPlayer),
    });
  } catch (error) {
    console.error('Search players error:', error);
    return res.status(500).json({ error: 'Failed to search players' });
  }
}

export async function depositToPlayer(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const userId = Number(req.body.playerId);
  const amount = Number(req.body.amount);

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid player and amount' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

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

    const [[player]] = await connection.query(
      `SELECT id, name, balance FROM users WHERE id = ? AND role = 'user' FOR UPDATE`,
      [userId],
    );

    if (!player) {
      await connection.rollback();
      return res.status(404).json({ error: 'Player not found' });
    }

    await connection.query(`UPDATE agents SET balance = balance - ? WHERE id = ?`, [
      amount,
      agentId,
    ]);

    await connection.query(`UPDATE users SET balance = balance + ? WHERE id = ?`, [
      amount,
      userId,
    ]);

    const [agentTxResult] = await connection.query(
      `INSERT INTO agent_transactions (agent_id, user_id, type, amount, status)
       VALUES (?, ?, 'topup_player', ?, 'completed')`,
      [agentId, userId, amount],
    );

    const [depositTxResult] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'deposit', ?, 'approved', 'agent', NOW())`,
      [userId, amount],
    );

    await connection.query(
      `INSERT INTO agent_player_deposits (agent_id, user_id, amount)
       VALUES (?, ?, ?)`,
      [agentId, userId, amount],
    );

    await setWithdrawChannelOnFirstDeposit(connection, {
      userId,
      depositType: WITHDRAW_CHANNEL.AGENT,
      depositId: depositTxResult.insertId,
    });

    await addRequiredTurnover(userId, amount, 'deposit', connection);
    await processAgentCommission(connection, agentTxResult.insertId);

    const depositBonusResult = await processDepositBalanceBonus(connection, {
      id: depositTxResult.insertId,
      user_id: userId,
      type: 'deposit',
      status: 'approved',
      amount,
    });

    await connection.commit();

    await syncWalletBalance(userId);

    if (depositBonusResult) {
      await finalizeDepositBalanceBonusNotification(userId, depositBonusResult);
    }

    const [[updatedAgent]] = await pool.query(
      `SELECT balance FROM agents WHERE id = ?`,
      [agentId],
    );

    const [[updatedPlayer]] = await pool.query(
      `SELECT balance FROM users WHERE id = ?`,
      [userId],
    );

    return res.json({
      success: true,
      message: `Deposited ৳${amount}. New balance: ৳${Number(updatedAgent.balance)}`,
      amount,
      newAgentBalance: Number(updatedAgent.balance),
      playerNewBalance: Number(updatedPlayer.balance),
      playerName: player.name,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Deposit to player error:', error);
    return res.status(500).json({ error: 'Failed to deposit to player' });
  } finally {
    connection.release();
  }
}

export async function withdrawFromPlayer(req, res) {
  const pool = getPool();
  const agentId = getAgentId(req);
  if (!(await ensureActiveAgentAccount(agentId, res))) return;
  const userId = Number(req.body.playerId);
  const amount = Number(req.body.amount);

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid player and amount' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[player]] = await connection.query(
      `SELECT id, name, balance FROM users WHERE id = ? AND role = 'user' FOR UPDATE`,
      [userId],
    );

    if (!player) {
      await connection.rollback();
      return res.status(404).json({ error: 'Player not found' });
    }

    if (Number(player.balance) < amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient player balance' });
    }

    await connection.query(`UPDATE users SET balance = balance - ? WHERE id = ?`, [
      amount,
      userId,
    ]);

    await connection.query(`UPDATE agents SET balance = balance + ? WHERE id = ?`, [
      amount,
      agentId,
    ]);

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

    await processAgentCommission(connection, agentTxResult.insertId);

    await connection.commit();

    await syncWalletBalance(userId);

    const [[updatedPlayer]] = await pool.query(
      `SELECT balance FROM users WHERE id = ?`,
      [userId],
    );

    const [[updatedAgent]] = await pool.query(
      `SELECT balance FROM agents WHERE id = ?`,
      [agentId],
    );

    return res.json({
      success: true,
      message: `Withdrawn ৳${amount} from ${player.name}`,
      amount,
      newAgentBalance: Number(updatedAgent.balance),
      playerNewBalance: Number(updatedPlayer.balance),
      playerName: player.name,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Withdraw from player error:', error);
    return res.status(500).json({ error: 'Failed to withdraw from player' });
  } finally {
    connection.release();
  }
}

export default searchPlayers;
