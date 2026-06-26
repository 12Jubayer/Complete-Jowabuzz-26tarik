import { getPool } from '../config/db.js';
import { canAccessAdminApiPath, getAdminApiPath } from '../config/adminRoutePermissions.js';
import { parsePermissions } from '../services/adminManageService.js';
import { verifyToken } from '../utils/jwt.js';

export async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);

    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pool = getPool();
    const [[adminRow]] = await pool.query(
      `SELECT id, email, name, role, status, permissions
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [Number(decoded.sub)],
    );

    if (!adminRow) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (adminRow.status === 'suspended') {
      return res.status(403).json({ error: 'Admin account is suspended' });
    }

    if (adminRow.status === 'deleted') {
      return res.status(403).json({ error: 'Admin account has been deleted' });
    }

    if (adminRow.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = {
      sub: adminRow.id,
      id: adminRow.id,
      email: adminRow.email,
      name: adminRow.name,
      role: adminRow.role,
      permissions: parsePermissions(adminRow.permissions),
    };

    req.admin = admin;

    const apiPath = getAdminApiPath(req);
    if (!canAccessAdminApiPath(admin, apiPath, req)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default requireAdminAuth;
