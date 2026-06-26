import { verifyToken, jwt } from '../utils/jwt.js';
import { getPool } from '../config/db.js';

async function attachVerifiedUser(req, res, decoded) {
  const userId = Number(decoded.sub);
  if (!userId) {
    res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    return false;
  }

  const pool = getPool();
  const [[user]] = await pool.query(
    `SELECT id, role, status FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );

  if (!user || user.role !== 'user') {
    res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    return false;
  }

  if (user.status === 'deleted' || user.status === 'suspended') {
    res.status(403).json({ error: 'Account is not available', code: 'ACCOUNT_UNAVAILABLE' });
    return false;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active', code: 'ACCOUNT_UNAVAILABLE' });
    return false;
  }

  req.user = decoded;
  return true;
}

export async function requireUserAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'user') {
      return res.status(403).json({ error: 'User access required', code: 'TOKEN_INVALID' });
    }

    const ok = await attachVerifiedUser(req, res, decoded);
    if (!ok) return undefined;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Session expired, please login again',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
  }
}

export async function requireUserAuthForUpload(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Please login first', code: 'NO_TOKEN' });
  }

  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'user' || decoded.type === 'refresh') {
      return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
    }

    const ok = await attachVerifiedUser(req, res, decoded);
    if (!ok) return undefined;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Session expired, please login again',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ error: 'Invalid session', code: 'TOKEN_INVALID' });
  }
}

export default requireUserAuth;
