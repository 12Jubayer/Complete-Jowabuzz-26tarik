import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateWalletUid(prefix = 'EW') {
  let code = prefix;
  while (code.length < 8) {
    code += UID_CHARS[Math.floor(Math.random() * UID_CHARS.length)];
  }
  return code.slice(0, 10);
}

export async function generateUniqueWalletUid(db) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const uid = generateWalletUid();
    const [[existing]] = await db.query(
      `SELECT id FROM e_wallets WHERE wallet_uid = ? LIMIT 1`,
      [uid],
    );
    if (!existing) return uid;
  }
  return `EW${Date.now().toString(36).toUpperCase()}`;
}

export async function migrateAdminEWalletSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'e_wallet_tables.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export function formatWalletIdentifier(wallet) {
  if (wallet.email) return wallet.email;
  return wallet.phone;
}

export default {
  migrateAdminEWalletSchema,
  generateUniqueWalletUid,
  formatWalletIdentifier,
};
