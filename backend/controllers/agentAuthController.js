import { getPool } from '../config/db.js';
import { comparePassword } from '../utils/password.js';
import { signAgentToken } from '../utils/jwt.js';

function resolveLoginId(body = {}) {
  const raw = String(body.loginId || body.username || body.userId || body.mobile || '').trim();
  const normalizedMobile = raw.replace(/\D/g, '');
  return { raw, normalizedMobile };
}

export async function loginAgent(req, res) {
  const pool = getPool();
  const { raw: loginId, normalizedMobile } = resolveLoginId(req.body);
  const password = String(req.body.password || '');

  if (!loginId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, uid, name, mobile, password_hash, balance, commission_balance, status, role
       FROM agents
       WHERE uid = ?
          OR name = ?
          OR mobile = ?
          OR CAST(id AS CHAR) = ?
       LIMIT 1`,
      [loginId, loginId, normalizedMobile || loginId, loginId],
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid user ID or password' });
    }

    const agent = rows[0];

    if (agent.status === 'blocked' || agent.status === 'inactive') {
      return res.status(403).json({ error: 'Agent account is suspended' });
    }

    if (agent.status !== 'active') {
      return res.status(403).json({ error: 'Agent account is not active' });
    }

    const validPassword = await comparePassword(password, agent.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid user ID or password' });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;

    await pool.query(
      `UPDATE agents SET last_login = NOW(), last_login_ip = ? WHERE id = ?`,
      [clientIp, agent.id],
    );

    const token = signAgentToken(agent);

    return res.json({
      success: true,
      token,
      agent: {
        id: agent.id,
        uid: agent.uid,
        name: agent.name,
        mobile: agent.mobile,
        balance: Number(agent.balance),
        commissionBalance: Number(agent.commission_balance),
        role: agent.role,
        status: agent.status,
      },
    });
  } catch (error) {
    console.error('Agent login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

export default loginAgent;
