import { getPool } from '../config/db.js';

export async function migrateAgentSchema() {
  const pool = getPool();

  try {
    await pool.query(
      `ALTER TABLE agents ADD COLUMN uid VARCHAR(20) NULL UNIQUE AFTER id`,
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

export default migrateAgentSchema;
