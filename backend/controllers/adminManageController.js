import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import {
  ADMIN_PERMISSION_KEYS,
  ADMIN_PERMISSION_LABELS,
  buildAllPermissions,
  hasAdminPermission,
  normalizePermissions,
  parsePermissions,
} from '../services/adminManageService.js';
import { permanentlyDeleteSubAdmin } from '../services/adminDeleteService.js';

function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildAdminFilters(query) {
  const filters = [`a.status <> 'deleted'`];
  const params = [];

  const search = String(query.search || '').trim();
  if (search) {
    const like = `%${search}%`;
    filters.push('(a.name LIKE ? OR a.email LIKE ?)');
    params.push(like, like);
  }

  return { whereClause: `WHERE ${filters.join(' AND ')}`, params };
}

function getCurrentAdminId(req) {
  return Number(req.admin?.sub);
}

async function fetchCurrentAdmin(db, adminId) {
  const [[admin]] = await db.query(
    `SELECT id, name, email, role, status, permissions FROM admins WHERE id = ? LIMIT 1`,
    [adminId],
  );
  return admin || null;
}

async function ensureCanManageAdmins(req, res) {
  const adminId = getCurrentAdminId(req);
  const admin = await fetchCurrentAdmin(getPool(), adminId);

  if (!admin || admin.status !== 'active') {
    res.status(403).json({ error: 'Admin account is not active' });
    return null;
  }

  if (admin.role !== 'super_admin') {
    res.status(403).json({ error: 'Only super admin can manage admins' });
    return null;
  }

  return admin;
}

async function fetchAdminOrThrow(db, adminId, includeDeleted = false) {
  const deletedFilter = includeDeleted ? '' : `AND a.status <> 'deleted'`;
  const [[admin]] = await db.query(
    `SELECT a.id, a.name, a.email, a.role, a.status, a.permissions,
            a.created_at, a.updated_at, a.last_login, a.last_login_ip
     FROM admins a
     WHERE a.id = ? ${deletedFilter}
     LIMIT 1`,
    [adminId],
  );

  if (!admin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  return admin;
}

function formatAdminRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'admin',
    status: row.status,
    permissions: parsePermissions(row.permissions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login,
    lastLoginIp: row.last_login_ip,
  };
}

function preventSelfAction(res, currentAdminId, targetAdminId, actionLabel) {
  if (currentAdminId === targetAdminId) {
    res.status(400).json({ error: `You cannot ${actionLabel} your own account` });
    return true;
  }
  return false;
}

export async function listAdmins(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const pool = getPool();
  const { page, limit, offset } = parsePagination(req.query);
  const { whereClause, params } = buildAdminFilters(req.query);

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM admins a ${whereClause}`,
      params,
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.email, a.role, a.status, a.permissions,
              a.created_at, a.updated_at, a.last_login, a.last_login_ip
       FROM admins a
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      data: rows.map(formatAdminRow),
      total: Number(total),
      page,
      limit,
      permissionOptions: ADMIN_PERMISSION_KEYS.map((key) => ({
        key,
        label: ADMIN_PERMISSION_LABELS[key],
      })),
    });
  } catch (error) {
    console.error('List admins error:', error);
    return res.status(500).json({ error: 'Failed to fetch admins' });
  }
}

export async function getAdminById(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const adminId = Number(req.params.id);
  if (!adminId) {
    return res.status(400).json({ error: 'Invalid admin id' });
  }

  try {
    const admin = await fetchAdminOrThrow(getPool(), adminId, true);
    return res.json(formatAdminRow(admin));
  } catch (error) {
    console.error('Get admin error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load admin',
    });
  }
}

export async function createAdminAccount(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const pool = getPool();
  const name = String(req.body.name || req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const permissions = normalizePermissions(req.body.permissions);

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const [[existing]] = await pool.query(
      `SELECT id, status FROM admins WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [email],
    );

    if (existing) {
      if (existing.status === 'deleted') {
        await permanentlyDeleteSubAdmin(existing.id);
      } else {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }

    const passwordHash = await hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO admins (name, email, password_hash, role, status, permissions)
       VALUES (?, ?, ?, 'admin', 'active', ?)`,
      [name, email, passwordHash, JSON.stringify(permissions)],
    );

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: result.insertId,
        name,
        email,
        status: 'active',
        permissions,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ error: 'Failed to create admin' });
  }
}

export async function updateAdminPermissions(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const pool = getPool();
  const adminId = Number(req.params.id);
  const currentAdminId = getCurrentAdminId(req);
  const permissions = normalizePermissions(req.body.permissions);

  if (!adminId) {
    return res.status(400).json({ error: 'Invalid admin id' });
  }

  if (preventSelfAction(res, currentAdminId, adminId, 'update permissions for')) return;

  try {
    const admin = await fetchAdminOrThrow(pool, adminId);

    if (admin.role === 'super_admin') {
      return res.status(400).json({ error: 'Super admin permissions cannot be changed' });
    }

    await pool.query(`UPDATE admins SET permissions = ? WHERE id = ?`, [
      JSON.stringify(permissions),
      adminId,
    ]);

    return res.json({
      success: true,
      message: 'Permissions updated successfully',
      permissions,
    });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update permissions',
    });
  }
}

export async function updateAdminAccountStatus(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const pool = getPool();
  const adminId = Number(req.params.id);
  const currentAdminId = getCurrentAdminId(req);
  const status = String(req.body.status || '').trim().toLowerCase();

  if (!adminId || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid admin id or status' });
  }

  if (preventSelfAction(res, currentAdminId, adminId, 'suspend or activate')) return;

  try {
    const admin = await fetchAdminOrThrow(pool, adminId);

    if (admin.role === 'super_admin' && status === 'suspended') {
      return res.status(400).json({ error: 'Super admin cannot be suspended' });
    }

    await pool.query(`UPDATE admins SET status = ? WHERE id = ?`, [status, adminId]);

    return res.json({
      success: true,
      message: status === 'active' ? 'Admin activated' : 'Admin suspended',
      status,
    });
  } catch (error) {
    console.error('Update admin status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update admin status',
    });
  }
}

export async function changeAdminAccountPassword(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const pool = getPool();
  const adminId = Number(req.params.id);
  const password = String(req.body.password || req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!adminId) {
    return res.status(400).json({ error: 'Invalid admin id' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    await fetchAdminOrThrow(pool, adminId, true);
    const passwordHash = await hashPassword(password);

    await pool.query(`UPDATE admins SET password_hash = ? WHERE id = ?`, [passwordHash, adminId]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change admin password error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to change password',
    });
  }
}

export async function deleteAdminAccount(req, res) {
  if (!(await ensureCanManageAdmins(req, res))) return;

  const adminId = Number(req.params.id);
  const currentAdminId = getCurrentAdminId(req);

  if (!adminId) {
    return res.status(400).json({ error: 'Invalid admin id' });
  }

  if (preventSelfAction(res, currentAdminId, adminId, 'delete')) return;

  try {
    const result = await permanentlyDeleteSubAdmin(adminId);

    return res.json({
      success: true,
      message: 'Admin deleted successfully',
      deletedAdminId: result.deletedAdminId,
      deletedRows: result.deletedRows,
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete admin',
    });
  }
}

export async function updateSubAdminStatus(req, res) {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can perform this action' });
  }

  const pool = getPool();
  const adminId = Number(req.params.id);
  const currentAdminId = getCurrentAdminId(req);
  const status = String(req.body.status || '').trim().toLowerCase();

  if (!adminId || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid admin id or status' });
  }

  if (preventSelfAction(res, currentAdminId, adminId, 'suspend or activate')) return;

  try {
    const admin = await fetchAdminOrThrow(pool, adminId);

    if (admin.role === 'super_admin') {
      return res.status(400).json({ error: 'Super admin cannot be suspended' });
    }

    await pool.query(`UPDATE admins SET status = ? WHERE id = ?`, [status, adminId]);

    return res.json({
      success: true,
      message: status === 'active' ? 'Sub admin activated' : 'Sub admin suspended',
      status,
    });
  } catch (error) {
    console.error('Update sub admin status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update sub admin status',
    });
  }
}

export async function deleteSubAdmin(req, res) {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can perform this action' });
  }

  const adminId = Number(req.params.id);
  const currentAdminId = getCurrentAdminId(req);

  if (!adminId) {
    return res.status(400).json({ error: 'Invalid admin id' });
  }

  if (preventSelfAction(res, currentAdminId, adminId, 'delete')) return;

  try {
    const result = await permanentlyDeleteSubAdmin(adminId);

    return res.json({
      success: true,
      message: 'Sub admin deleted successfully',
      deletedAdminId: result.deletedAdminId,
      deletedRows: result.deletedRows,
    });
  } catch (error) {
    console.error('Delete sub admin error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete sub admin',
    });
  }
}

export default listAdmins;
