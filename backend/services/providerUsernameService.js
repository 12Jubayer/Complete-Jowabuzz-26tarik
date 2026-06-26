import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NUMERIC_PLAYER_CODE_PATTERN = /^\d{6,12}$/;

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/** @deprecated legacy env prefix; player code is numeric-only now. */
export function getProviderUsernamePrefix() {
  return String(process.env.ORACLE_PLAYER_USERNAME_PREFIX || 'nfc').trim().toLowerCase() || 'nfc';
}


export function normalizePhoneDigits(phone = '') {
  return String(phone || '').replace(/\D/g, '');
}

export function providerUsernameCollidesWithPhone(providerUsername, phone = '') {
  const code = String(providerUsername || '').trim();
  const phoneDigits = normalizePhoneDigits(phone);
  if (!code || !phoneDigits) return false;
  if (code === phoneDigits) return true;
  if (phoneDigits.length === 11 && phoneDigits.startsWith('0') && code === phoneDigits.slice(1)) {
    return true;
  }
  if (code.length === 10 && phoneDigits.length === 11 && phoneDigits.endsWith(code)) {
    return true;
  }
  return false;
}

export function isValidNumericPlayerCode(code) {
  return NUMERIC_PLAYER_CODE_PATTERN.test(String(code || '').trim());
}

export function extractProviderAliasSuffix(alias) {
  return extractNumericPlayerCode(alias);
}

export function extractNumericPlayerCode(code) {
  const value = String(code || '').trim();
  if (isValidNumericPlayerCode(value)) return value;

  const hyphenMatch = value.match(/^[A-Z0-9]{2,20}-(\d{6,12})$/i);
  if (hyphenMatch) return hyphenMatch[1];

  const legacyMatch = value.match(/^[a-z]+(\d{6,12})$/i);
  if (legacyMatch) return legacyMatch[1];

  return null;
}

export function buildDeterministicProviderSuffix(userId) {
  let hash = 2166136261;
  const seed = `jowabuzz-provider:${userId}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(100000000 + ((hash >>> 0) % 900000000));
}

export function composeProviderUsername(_unused, suffix, userId = 0) {
  const numeric =
    extractNumericPlayerCode(suffix) ||
    (isValidNumericPlayerCode(suffix) ? String(suffix).trim() : null) ||
    buildDeterministicProviderSuffix(userId);
  return numeric;
}

export function isLegacyProviderUsername(code) {
  const value = String(code || '').trim();
  if (!value) return true;
  return !isValidNumericPlayerCode(value);
}

/** @deprecated username prefix no longer used; numeric code only. */
export function normalizePlayerCodePrefix(name = '', userId = 0) {
  const cleaned = String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  if (cleaned.length >= 2) return cleaned.slice(0, 20);
  if (cleaned.length === 1) return `${cleaned}U${userId}`;
  return `USER${userId}`;
}

/** @deprecated numeric code is not tied to username anymore. */
export function providerUsernameMatchesUser(code) {
  return isValidNumericPlayerCode(code);
}

async function findStoredAliasSuffix(connection, userId) {
  const [[row]] = await connection.query(
    `SELECT username FROM gaming_transactions
     WHERE user_id = ?
       AND (
         username REGEXP '^[0-9]{6,12}$'
         OR username REGEXP '^[A-Z0-9]{2,20}-[0-9]{6,}$'
         OR username REGEXP '^[a-z][a-z0-9]*[0-9]{6,}$'
       )
     ORDER BY id DESC
     LIMIT 1`,
    [userId],
  );
  return row ? extractNumericPlayerCode(row.username) : null;
}

export async function ensureProviderUsername(userId, connection = null) {
  const numericUserId = Number(userId);
  if (!numericUserId) return null;

  const assign = async (conn) => {
    const [[user]] = await conn.query(
      `SELECT id, name, phone, provider_username FROM users WHERE id = ? LIMIT 1 FOR UPDATE`,
      [numericUserId],
    );
    if (!user) return null;

    const existing = String(user.provider_username || '').trim();
    if (
      existing
      && isValidNumericPlayerCode(existing)
      && !providerUsernameCollidesWithPhone(existing, user.phone)
    ) {
      return existing;
    }

    const reusableExisting =
      existing && !providerUsernameCollidesWithPhone(existing, user.phone)
        ? extractNumericPlayerCode(existing)
        : null;

    let aliasSuffix = await findStoredAliasSuffix(conn, numericUserId);
    if (aliasSuffix && providerUsernameCollidesWithPhone(aliasSuffix, user.phone)) {
      aliasSuffix = null;
    }

    const suffix =
      reusableExisting ||
      aliasSuffix ||
      buildDeterministicProviderSuffix(numericUserId);

    let candidate = composeProviderUsername(null, suffix, numericUserId);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [[duplicate]] = await conn.query(
        `SELECT id FROM users WHERE provider_username = ? AND id <> ? LIMIT 1`,
        [candidate, numericUserId],
      );
      if (!duplicate) break;
      candidate = buildDeterministicProviderSuffix(numericUserId + attempt + 1);
    }

    await conn.query(`UPDATE users SET provider_username = ? WHERE id = ?`, [
      candidate,
      numericUserId,
    ]);

    return candidate;
  };

  if (connection) {
    return assign(connection);
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const username = await assign(conn);
    await conn.commit();
    return username;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function migrateProviderUsernameSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'provider_username.sql');

  try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    for (const statement of splitSqlStatements(schema)) {
      await pool.query(statement);
    }
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  try {
    await pool.query(
      `CREATE UNIQUE INDEX uq_users_provider_username ON users (provider_username)`,
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME') throw error;
  }

  const [rows] = await pool.query(
    `SELECT id FROM users WHERE role = 'user'`,
  );

  for (const row of rows) {
    await ensureProviderUsername(row.id);
  }
}

export default {
  migrateProviderUsernameSchema,
  ensureProviderUsername,
  getProviderUsernamePrefix,
  composeProviderUsername,
  isValidNumericPlayerCode,
  extractNumericPlayerCode,
  isLegacyProviderUsername,
};
