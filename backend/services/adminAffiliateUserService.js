import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function mapAffiliateStatusForUi(status) {
  if (status === 'approved') return 'active';
  if (status === 'blocked') return 'suspended';
  return status;
}

export function mapAffiliateStatusForDb(status) {
  if (status === 'active') return 'approved';
  if (status === 'suspended') return 'blocked';
  return status;
}

export async function migrateAdminAffiliateUserSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'affiliate_transactions.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER name`,
    );
  } catch {
    // column may exist
  }

  try {
    await pool.query(`ALTER TABLE users ADD UNIQUE KEY uq_users_username (username)`);
  } catch {
    // index may exist
  }

  try {
    await pool.query(
      `ALTER TABLE affiliate_profiles ADD COLUMN total_link_clicks INT NOT NULL DEFAULT 0 AFTER total_referrals`,
    );
  } catch {
    // column may exist
  }

  try {
    await pool.query(
      `ALTER TABLE affiliate_profiles ADD COLUMN total_signups INT NOT NULL DEFAULT 0 AFTER total_link_clicks`,
    );
  } catch {
    // column may exist
  }
}

export function formatAffiliateIdentifier(user) {
  if (user.email) return user.email;
  return user.phone;
}

export function buildReferralLink(referralCode) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base.replace(/\/$/, '')}/auth?ref=${encodeURIComponent(referralCode)}`;
}

export default {
  migrateAdminAffiliateUserSchema,
  mapAffiliateStatusForUi,
  mapAffiliateStatusForDb,
  formatAffiliateIdentifier,
  buildReferralLink,
};
