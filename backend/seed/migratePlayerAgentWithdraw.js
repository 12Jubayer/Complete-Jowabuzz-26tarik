import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migratePlayerAgentWithdrawSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'player_agent_withdraw_requests.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);

  try {
    await pool.query(
      `ALTER TABLE player_agent_withdraw_requests
       ADD COLUMN otp_code VARCHAR(6) NULL AFTER otp_hash`,
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

export default migratePlayerAgentWithdrawSchema;
