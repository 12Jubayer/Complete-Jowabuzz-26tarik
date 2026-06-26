#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, getPool } from '../config/db.js';
import {
  getHmkPublicStatus,
  isHmkConfigured,
  isOracleDisabled,
  migrateHmkSchema,
} from '../services/hmkApiService.js';

async function main() {
  await connectDatabase();
  await migrateHmkSchema();
  const pool = getPool();
  const [tables] = await pool.query(`SHOW TABLES LIKE 'hmk_game_transactions'`);
  console.log('oracle_disabled:', isOracleDisabled());
  console.log('hmk_configured:', isHmkConfigured());
  console.log('hmk_status:', JSON.stringify(getHmkPublicStatus(), null, 2));
  console.log('hmk_table:', tables.length === 1 ? 'ok' : 'missing');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
