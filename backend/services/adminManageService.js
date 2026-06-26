import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ADMIN_PERMISSION_KEYS = [
  'manage_users',
  'manage_deposits',
  'manage_withdrawals',
  'manage_games',
  'manage_bonuses',
  'manage_chat',
  'site_settings',
  'view_reports',
];

export const ADMIN_PERMISSION_LABELS = {
  manage_users: 'Manage Users',
  manage_deposits: 'Manage Deposits',
  manage_withdrawals: 'Manage Withdrawals',
  manage_games: 'Manage Games',
  manage_bonuses: 'Manage Bonuses',
  manage_chat: 'Manage Chat',
  site_settings: 'Site Settings',
  view_reports: 'View Reports',
};

export function buildAllPermissions(enabled = true) {
  return ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = enabled;
    return acc;
  }, {});
}

export function normalizePermissions(input) {
  const base = buildAllPermissions(false);
  if (!input || typeof input !== 'object') {
    return base;
  }

  ADMIN_PERMISSION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      base[key] = Boolean(input[key]);
    }
  });

  return base;
}

export function parsePermissions(value) {
  if (!value) return buildAllPermissions(false);
  if (typeof value === 'object') return normalizePermissions(value);
  try {
    return normalizePermissions(JSON.parse(value));
  } catch {
    return buildAllPermissions(false);
  }
}

export function hasAdminPermission(admin, permissionKey) {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;
  const permissions = parsePermissions(admin.permissions);
  return Boolean(permissions[permissionKey]);
}

export async function migrateAdminManageSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'admins.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  try {
    const { cleanupSoftDeletedAdmins } = await import('./adminDeleteService.js');
    const cleanup = await cleanupSoftDeletedAdmins();
    if (cleanup.removed > 0) {
      console.info('[admin] removed soft-deleted admin rows:', cleanup.removed);
    }
  } catch (error) {
    console.error('Soft-deleted admin cleanup failed:', error.message);
  }

  const [legacyAdmins] = await pool.query(
    `SELECT name, email, password_hash, status, created_at
     FROM users
     WHERE role = 'admin'`,
  );

  for (const legacy of legacyAdmins) {
    const [[existing]] = await pool.query(`SELECT id FROM admins WHERE email = ? LIMIT 1`, [
      legacy.email,
    ]);

    if (existing) continue;

    await pool.query(
      `INSERT INTO admins (name, email, password_hash, role, status, permissions, created_at)
       VALUES (?, ?, ?, 'super_admin', ?, ?, ?)`,
      [
        legacy.name,
        legacy.email,
        legacy.password_hash,
        legacy.status === 'suspended' ? 'suspended' : 'active',
        JSON.stringify(buildAllPermissions(true)),
        legacy.created_at,
      ],
    );
  }
}

export default {
  migrateAdminManageSchema,
  ADMIN_PERMISSION_KEYS,
  ADMIN_PERMISSION_LABELS,
  buildAllPermissions,
  normalizePermissions,
  parsePermissions,
  hasAdminPermission,
};
