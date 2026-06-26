import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, getPool } from '../config/db.js';
import {
  ensureProviderUsername,
  providerUsernameCollidesWithPhone,
} from '../services/providerUsernameService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

await connectDatabase();
const pool = getPool();
const [rows] = await pool.query(
  `SELECT id, phone, provider_username, name FROM users WHERE role = 'user'`,
);

let repaired = 0;
for (const row of rows) {
  const current = String(row.provider_username || '').trim();
  if (!providerUsernameCollidesWithPhone(current, row.phone)) continue;
  const next = await ensureProviderUsername(row.id);
  console.log('repaired', JSON.stringify({ id: row.id, name: row.name, from: current, to: next }));
  repaired += 1;
}

console.log('done', { repaired });
process.exit(0);
