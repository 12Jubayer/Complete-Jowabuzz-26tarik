import { getPool } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAdminToken } from '../utils/jwt.js';
import {
  buildAllPermissions,
  parsePermissions,
} from '../services/adminManageService.js';

export async function loginAdmin(req, res) {
  const pool = getPool();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [[admin]] = await pool.query(
      `SELECT id, name, email, password_hash, role, status, permissions
       FROM admins
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (admin.status === 'deleted') {
      return res.status(403).json({ error: 'Admin account has been deleted' });
    }

    if (admin.status === 'suspended') {
      return res.status(403).json({ error: 'Admin account is suspended' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ error: 'Admin account is not active' });
    }

    const validPassword = await comparePassword(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    await pool.query(`UPDATE admins SET last_login = NOW(), last_login_ip = ? WHERE id = ?`, [
      ipAddress,
      admin.id,
    ]);

    const token = signAdminToken(admin);
    const permissions = parsePermissions(admin.permissions);

    return res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

export async function getAdminMe(req, res) {
  const pool = getPool();

  try {
    const [[admin]] = await pool.query(
      `SELECT id, name, email, role, status, permissions, last_login
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [Number(req.admin.sub)],
    );

    if (!admin || admin.status !== 'active') {
      return res.status(403).json({ error: 'Admin account is not active' });
    }

    return res.json({
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: parsePermissions(admin.permissions),
        lastLogin: admin.last_login,
      },
    });
  } catch (error) {
    console.error('Get admin me error:', error);
    return res.status(500).json({ error: 'Failed to load admin profile' });
  }
}

export async function ensureDefaultAdmin() {
  const pool = getPool();
  const defaultEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const [[existing]] = await pool.query(`SELECT id FROM admins LIMIT 1`);

  if (existing) {
    return;
  }

  const passwordHash = await hashPassword(defaultPassword);

  await pool.query(
    `INSERT INTO admins (name, email, password_hash, role, status, permissions)
     VALUES (?, ?, ?, 'super_admin', 'active', ?)`,
    ['Admin', defaultEmail, passwordHash, JSON.stringify(buildAllPermissions(true))],
  );

  console.log(`Default admin seeded (${defaultEmail})`);
}

export default loginAdmin;
