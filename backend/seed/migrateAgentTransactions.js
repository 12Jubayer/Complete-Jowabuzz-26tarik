import { getPool } from '../config/db.js';

export async function migrateAgentTransactionsSchema() {
  const pool = getPool();

  try {
    await pool.query(
      `ALTER TABLE agent_transactions ADD COLUMN user_id BIGINT NULL AFTER agent_id`,
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  try {
    await pool.query(
      `ALTER TABLE agent_transactions
       MODIFY COLUMN type ENUM('deposit', 'withdraw', 'topup_player') NOT NULL`,
    );
  } catch (error) {
    // ignore if already migrated
  }

  await pool.query(
    `UPDATE agent_transactions at
     INNER JOIN agent_player_deposits apd
       ON apd.agent_id = at.agent_id
       AND apd.amount = at.amount
       AND ABS(TIMESTAMPDIFF(SECOND, apd.created_at, at.created_at)) < 10
     SET at.type = 'topup_player', at.user_id = apd.user_id
     WHERE at.type = 'withdraw' AND at.user_id IS NULL`,
  ).catch(() => {});

  try {
    await pool.query(
      `ALTER TABLE agent_transactions
       MODIFY COLUMN type ENUM('deposit', 'topup_player', 'withdraw') NOT NULL`,
    );
  } catch (error) {
    // ignore
  }

  try {
    await pool.query(
      `ALTER TABLE agent_transactions
       MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'completed'`,
    );
  } catch (error) {
    // ignore
  }

  await pool.query(
    `UPDATE agent_transactions SET status = 'completed' WHERE status = 'approved'`,
  ).catch(() => {});

  try {
    await pool.query(
      `ALTER TABLE agent_transactions
       ADD CONSTRAINT fk_agent_transactions_user
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`,
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_CANT_CREATE_TABLE') {
      // ignore duplicate foreign key attempts
    }
  }
}

export default migrateAgentTransactionsSchema;
