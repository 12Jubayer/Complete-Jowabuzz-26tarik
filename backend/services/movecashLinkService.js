import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { getSiteSetting, upsertSiteSetting } from './siteSettingsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MOVECASH_APK_SETTING_KEY = 'movecash_apk';

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function mapLinkRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    token: row.token,
    isActive: Boolean(row.is_active),
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function isLinkExpired(link) {
  if (!link?.expiresAt) return false;
  return new Date(link.expiresAt).getTime() <= Date.now();
}

export async function migrateMoveCashSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'movecash_app_links.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }
  return true;
}

export async function getActiveMoveCashLink() {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT * FROM movecash_app_links
     WHERE is_active = 1
     ORDER BY id DESC
     LIMIT 1`,
  );
  const link = mapLinkRow(row);
  if (!link || isLinkExpired(link)) return null;
  return link;
}

export async function validateMoveCashToken(token) {
  const safeToken = String(token || '').trim();
  if (!safeToken || safeToken.length < 16) return null;

  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT * FROM movecash_app_links
     WHERE token = ? AND is_active = 1
     LIMIT 1`,
    [safeToken],
  );
  const link = mapLinkRow(row);
  if (!link || isLinkExpired(link)) return null;
  return link;
}

export async function deactivateAllMoveCashLinks(connection = null) {
  const pool = connection || getPool();
  await pool.query(`UPDATE movecash_app_links SET is_active = 0, updated_at = NOW() WHERE is_active = 1`);
}

export async function regenerateMoveCashLink({ adminId = null, expiresAt = null } = {}) {
  const pool = getPool();
  const connection = await pool.getConnection();
  const token = generateSecureToken();

  try {
    await connection.beginTransaction();
    await deactivateAllMoveCashLinks(connection);

    const [result] = await connection.query(
      `INSERT INTO movecash_app_links (token, is_active, created_by_admin_id, expires_at)
       VALUES (?, 1, ?, ?)`,
      [token, adminId || null, expiresAt || null],
    );

    await connection.commit();

    const [[row]] = await pool.query(`SELECT * FROM movecash_app_links WHERE id = ? LIMIT 1`, [
      result.insertId,
    ]);
    return mapLinkRow(row);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateMoveCashLinkExpiry({ expiresAt = null } = {}) {
  const pool = getPool();
  const active = await getActiveMoveCashLink();
  if (!active) {
    const error = new Error('No active MoveCash link found');
    error.statusCode = 404;
    throw error;
  }

  await pool.query(`UPDATE movecash_app_links SET expires_at = ?, updated_at = NOW() WHERE id = ?`, [
    expiresAt || null,
    active.id,
  ]);

  const [[row]] = await pool.query(`SELECT * FROM movecash_app_links WHERE id = ? LIMIT 1`, [active.id]);
  return mapLinkRow(row);
}

export async function ensureActiveMoveCashLink({ adminId = null } = {}) {
  const existing = await getActiveMoveCashLink();
  if (existing) return existing;
  return regenerateMoveCashLink({ adminId });
}

export async function getMoveCashApkInfo() {
  const raw = await getSiteSetting(MOVECASH_APK_SETTING_KEY);
  if (!raw || !raw.url) return { available: false, url: null, filename: null, updatedAt: null };
  return {
    available: true,
    url: raw.url,
    filename: raw.filename || 'movecash.apk',
    updatedAt: raw.updatedAt || null,
  };
}

export async function saveMoveCashApkInfo({ url, filename }) {
  const payload = {
    url: String(url || '').trim(),
    filename: String(filename || 'movecash.apk').trim(),
    updatedAt: new Date().toISOString(),
  };
  await upsertSiteSetting(MOVECASH_APK_SETTING_KEY, payload);
  return getMoveCashApkInfo();
}

export async function removeMoveCashApkInfo() {
  await upsertSiteSetting(MOVECASH_APK_SETTING_KEY, { url: '', filename: '', updatedAt: null });
  return { available: false, url: null, filename: null, updatedAt: null };
}

export function buildMoveCashDownloadUrl(token, req = null) {
  const base =
    process.env.MOVECASH_PUBLIC_BASE_URL ||
    process.env.PUBLIC_SITE_URL ||
    (req ? `${req.protocol}://${req.get('host')}` : 'https://jowabuzz.com');
  return `${String(base).replace(/\/$/, '')}/movecash/download/${token}`;
}
