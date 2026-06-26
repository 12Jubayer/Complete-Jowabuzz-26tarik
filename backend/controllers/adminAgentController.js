import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  generateUniqueAgentUid,
  getAgentFinancialSummary,
  mapAgentStatusForDb,
  mapAgentStatusForUi,
} from '../services/adminAgentService.js';
import { logAdminAudit } from '../services/adminPlayerService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildAgentFilters(query) {
  const filters = [];
  const params = [];

  const status = String(query.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    filters.push('a.status = ?');
    params.push(status === 'suspended' ? 'blocked' : status);
  }

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    const numericId = Number(search);
    filters.push(
      `(a.name LIKE ? OR a.mobile LIKE ? OR a.uid LIKE ? OR CAST(a.id AS CHAR) LIKE ?${
        numericId > 0 ? ' OR a.id = ?' : ''
      })`,
    );
    params.push(like, like, like, like);
    if (numericId > 0) {
      params.push(numericId);
    }
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  return { whereClause, params };
}

function getAdminMeta(req) {
  return {
    adminId: Number(req.admin?.sub) || null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
  };
}

async function fetchAgentOrThrow(db, agentId) {
  const [[agent]] = await db.query(
    `SELECT id, uid, name, mobile, password_hash, balance, commission_balance, status, role,
            created_at, last_login, last_login_ip
     FROM agents
     WHERE id = ?
     LIMIT 1`,
    [agentId],
  );

  if (!agent) {
    const error = new Error('Agent not found');
    error.statusCode = 404;
    throw error;
  }

  return agent;
}

function formatAgentRow(row) {
  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    mobile: row.mobile,
    role: row.role || 'agent',
    balance: Number(row.balance),
    commissionBalance: Number(row.commission_balance ?? 0),
    status: mapAgentStatusForUi(row.status),
    createdAt: row.created_at,
    lastLogin: row.last_login,
    lastLoginIp: row.last_login_ip,
  };
}

export async function listAdminAgents(req, res) {
  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildAgentFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM agents a ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.uid, a.name, a.mobile, a.balance, a.commission_balance, a.status, a.role,
              a.created_at, a.last_login, a.last_login_ip
       FROM agents a
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map(formatAgentRow),
      total: Number(total),
      page,
      limit,
    });
  } catch (error) {
    console.error('List admin agents error:', error);
    return res.status(500).json({ error: 'Failed to fetch agents' });
  }
}

export async function getAdminAgentInfo(req, res) {
  const pool = getPool();
  const agentId = Number(req.params.id);

  if (!agentId) {
    return res.status(400).json({ error: 'Invalid agent id' });
  }

  try {
    const agent = await fetchAgentOrThrow(pool, agentId);
    const summary = await getAgentFinancialSummary(pool, agentId);

    const [transactions] = await pool.query(
      `SELECT at.id, at.type, at.amount, at.status, at.created_at AS createdAt,
              u.name AS userName, u.phone AS userPhone
       FROM agent_transactions at
       LEFT JOIN users u ON u.id = at.user_id
       WHERE at.agent_id = ?
       ORDER BY at.created_at DESC
       LIMIT 20`,
      [agentId],
    );

    return res.json({
      ...formatAgentRow(agent),
      ...summary,
      latestTransactions: transactions.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.createdAt,
        userName: row.userName,
        userPhone: row.userPhone,
      })),
    });
  } catch (error) {
    console.error('Get admin agent info error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load agent info',
    });
  }
}

export async function createAdminAgent(req, res) {
  const pool = getPool();
  const name = String(req.body.name || '').trim();
  const mobile = String(req.body.mobile || '').replace(/\D/g, '');
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || req.body.confirm_password || '');
  const initialBalance = Number(req.body.initialBalance || req.body.initial_balance || 0);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Name and mobile are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (initialBalance < 0) {
    return res.status(400).json({ error: 'Initial balance cannot be negative' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT id FROM agents WHERE mobile = ? LIMIT 1`,
      [mobile],
    );

    if (existing) {
      await connection.rollback();
      return res.status(409).json({ error: 'Mobile number already registered' });
    }

    const passwordHash = await hashPassword(password);
    const uid = await generateUniqueAgentUid(connection);

    const [result] = await connection.query(
      `INSERT INTO agents (uid, name, mobile, password_hash, balance, commission_balance, status, role)
       VALUES (?, ?, ?, ?, ?, 0, 'active', 'agent')`,
      [uid, name, mobile, passwordHash, initialBalance],
    );

    const agentId = result.insertId;

    if (initialBalance > 0) {
      await connection.query(
        `INSERT INTO agent_transactions (agent_id, type, amount, status, approved_at)
         VALUES (?, 'deposit', ?, 'completed', NOW())`,
        [agentId, initialBalance],
      );
    }

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'agent_create',
      details: { agentId, uid, name, mobile, initialBalance },
      ipAddress,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: { id: agentId, uid, name, mobile, balance: initialBalance },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create admin agent error:', error);
    return res.status(500).json({ error: 'Failed to create agent' });
  } finally {
    connection.release();
  }
}

export async function updateAdminAgentStatus(req, res) {
  const pool = getPool();
  const agentId = Number(req.params.id);
  const statusInput = String(req.body.status || '').trim().toLowerCase();
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!agentId || !['active', 'suspended'].includes(statusInput)) {
    return res.status(400).json({ error: 'Invalid agent id or status' });
  }

  const dbStatus = mapAgentStatusForDb(statusInput);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const agent = await fetchAgentOrThrow(connection, agentId);

    await connection.query(`UPDATE agents SET status = ? WHERE id = ?`, [dbStatus, agentId]);

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'agent_status_update',
      details: { agentId, from: agent.status, to: dbStatus },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: statusInput === 'active' ? 'Agent activated' : 'Agent suspended',
      status: statusInput,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Update agent status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update agent status',
    });
  } finally {
    connection.release();
  }
}

export async function adjustAdminAgentBalance(req, res) {
  const pool = getPool();
  const agentId = Number(req.params.id);
  const type = String(req.body.type || '').trim().toLowerCase();
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason || '').trim() || 'Admin balance adjustment';
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!agentId || !['add', 'deduct'].includes(type)) {
    return res.status(400).json({ error: 'Invalid agent id or adjustment type' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  const connection = await pool.getConnection();
  const delta = type === 'add' ? amount : -amount;

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

    const nextBalance = Number(agent.balance) + delta;
    if (nextBalance < 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient agent balance' });
    }

    await connection.query(`UPDATE agents SET balance = ? WHERE id = ?`, [nextBalance, agentId]);

    await connection.query(
      `INSERT INTO agent_transactions (agent_id, type, amount, status, approved_at)
       VALUES (?, 'adjustment', ?, 'completed', NOW())`,
      [agentId, amount],
    );

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'agent_balance_adjust',
      details: { agentId, type, amount, reason, balance: nextBalance },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: 'Agent balance updated successfully',
      balance: nextBalance,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Adjust agent balance error:', error);
    return res.status(500).json({ error: 'Failed to adjust agent balance' });
  } finally {
    connection.release();
  }
}

export async function deleteAdminAgent(req, res) {
  const pool = getPool();
  const agentId = Number(req.params.id);
  const { adminId, ipAddress } = getAdminMeta(req);

  if (!agentId) {
    return res.status(400).json({ error: 'Invalid agent id' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const agent = await fetchAgentOrThrow(connection, agentId);
    const balance = Number(agent.balance || 0);

    if (balance > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Balance 0 না হলে Agent delete করা যাবে না' });
    }

    await connection.query(
      `DELETE FROM player_agent_withdraw_requests WHERE agent_id = ?`,
      [agentId],
    );

    await connection.query(`DELETE FROM agents WHERE id = ?`, [agentId]);

    await logAdminAudit(connection, {
      adminId,
      userId: null,
      action: 'agent_delete',
      details: { agentId, uid: agent.uid, name: agent.name, mobile: agent.mobile },
      ipAddress,
    });

    await connection.commit();

    return res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete admin agent error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete agent',
    });
  } finally {
    connection.release();
  }
}

export default listAdminAgents;
