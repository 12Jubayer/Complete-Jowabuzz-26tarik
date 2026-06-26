import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrateAgentOtpsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'agent_otps.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

export default migrateAgentOtpsSchema;
