import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

function getAdminIdFromRequest(req) {
  return Number(req.admin?.sub);
}

async function fetchActiveAdmin(pool, adminId) {
  const [[admin]] = await pool.query(
    `SELECT id, name, email, status, updated_at
     FROM admins
     WHERE id = ?
     LIMIT 1`,
    [adminId],
  );

  if (!admin || admin.status !== 'active') {
    const error = new Error('Admin account is not active');
    error.statusCode = 403;
    throw error;
  }

  return admin;
}

export async function getAdminProfile(adminId) {
  const pool = getPool();
  const admin = await fetchActiveAdmin(pool, adminId);

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    updatedAt: admin.updated_at,
  };
}

export async function updateAdminProfile(adminId, name) {
  const pool = getPool();
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }

  if (trimmedName.length > 120) {
    const error = new Error('Name must be 120 characters or less');
    error.statusCode = 400;
    throw error;
  }

  await fetchActiveAdmin(pool, adminId);

  await pool.query(`UPDATE admins SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    trimmedName,
    adminId,
  ]);

  return getAdminProfile(adminId);
}

export async function updateAdminProfilePassword(adminId, password) {
  const pool = getPool();
  const nextPassword = String(password || '');

  if (!nextPassword || nextPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.statusCode = 400;
    throw error;
  }

  await fetchActiveAdmin(pool, adminId);

  const passwordHash = await hashPassword(nextPassword);

  await pool.query(
    `UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [passwordHash, adminId],
  );

  return { success: true };
}

export { getAdminIdFromRequest };

export default {
  getAdminProfile,
  updateAdminProfile,
  updateAdminProfilePassword,
  getAdminIdFromRequest,
};
