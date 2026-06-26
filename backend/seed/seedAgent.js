import { getPool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';

const DEMO_MOBILE = '01700000000';
const DEMO_PASSWORD = '123456';
const DEMO_NAME = 'Admin';
const DEMO_UID = 'A1ADA848';
const DEMO_BALANCE = 980;
const DEMO_DEPOSIT = 20;

export async function ensureDemoAgent() {
  const pool = getPool();

  const [existing] = await pool.query(
    `SELECT id FROM agents WHERE mobile = ? LIMIT 1`,
    [DEMO_MOBILE],
  );

  if (existing.length) {
    await pool.query(
      `UPDATE agents
       SET uid = ?, name = ?, balance = ?, status = 'active'
       WHERE mobile = ?`,
      [DEMO_UID, DEMO_NAME, DEMO_BALANCE, DEMO_MOBILE],
    );

    const agentId = existing[0].id;
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM agent_transactions WHERE agent_id = ?`,
      [agentId],
    );

    if (Number(count) === 0) {
      await pool.query(
        `INSERT INTO agent_transactions (agent_id, type, amount, status, approved_at)
         VALUES (?, 'deposit', ?, 'completed', NOW())`,
        [agentId, DEMO_DEPOSIT],
      );
    }

    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const [result] = await pool.query(
    `INSERT INTO agents (uid, name, mobile, password_hash, balance, status, role)
     VALUES (?, ?, ?, ?, ?, 'active', 'agent')`,
    [DEMO_UID, DEMO_NAME, DEMO_MOBILE, passwordHash, DEMO_BALANCE],
  );

  await pool.query(
    `INSERT INTO agent_transactions (agent_id, type, amount, status, approved_at)
     VALUES (?, 'deposit', ?, 'completed', NOW())`,
    [result.insertId, DEMO_DEPOSIT],
  );

  console.log(`Demo agent seeded (${DEMO_MOBILE} / ${DEMO_UID})`);
}

export default ensureDemoAgent;
