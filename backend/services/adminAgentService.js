import { getPool } from '../config/db.js';

const UID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateAgentUid(prefix = 'AG') {
  let code = prefix;
  while (code.length < 8) {
    code += UID_CHARS[Math.floor(Math.random() * UID_CHARS.length)];
  }
  return code.slice(0, 10);
}

export async function generateUniqueAgentUid(db) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const uid = generateAgentUid();
    const [[existing]] = await db.query(`SELECT id FROM agents WHERE uid = ? LIMIT 1`, [uid]);
    if (!existing) return uid;
  }
  return `AG${Date.now().toString(36).toUpperCase()}`;
}

export function mapAgentStatusForUi(status) {
  if (status === 'blocked') return 'suspended';
  return status;
}

export function mapAgentStatusForDb(status) {
  if (status === 'suspended') return 'blocked';
  return status;
}

export async function migrateAdminAgentSchema() {
  const pool = getPool();

  try {
    await pool.query(`ALTER TABLE agents ADD COLUMN last_login TIMESTAMP NULL AFTER updated_at`);
  } catch {
    // column may exist
  }

  try {
    await pool.query(`ALTER TABLE agents ADD COLUMN last_login_ip VARCHAR(45) NULL AFTER last_login`);
  } catch {
    // column may exist
  }

  try {
    await pool.query(
      `ALTER TABLE agent_transactions
       MODIFY COLUMN type ENUM('deposit', 'topup_player', 'withdraw', 'adjustment') NOT NULL`,
    );
  } catch {
    // enum may already include adjustment
  }

  const [rowsWithoutUid] = await pool.query(
    `SELECT id FROM agents WHERE uid IS NULL OR uid = ''`,
  );

  for (const row of rowsWithoutUid) {
    const uid = await generateUniqueAgentUid(pool);
    await pool.query(`UPDATE agents SET uid = ? WHERE id = ?`, [uid, row.id]);
  }
}

export async function getAgentFinancialSummary(pool, agentId) {
  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type IN ('topup_player', 'deposit') AND status IN ('completed', 'approved') THEN amount ELSE 0 END), 0) AS totalTopup,
       COALESCE(SUM(CASE WHEN type = 'withdraw' AND status IN ('completed', 'approved') THEN amount ELSE 0 END), 0) AS totalWithdraw
     FROM agent_transactions
     WHERE agent_id = ?`,
    [agentId],
  );

  return {
    totalTopup: Number(totals.totalTopup),
    totalWithdraw: Number(totals.totalWithdraw),
  };
}

export async function ensureActiveAgentAccount(agentId, res) {
  const pool = getPool();
  const [[agent]] = await pool.query(`SELECT status FROM agents WHERE id = ? LIMIT 1`, [agentId]);

  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return false;
  }

  if (agent.status !== 'active') {
    res.status(403).json({ error: 'Agent account is suspended' });
    return false;
  }

  return true;
}

export default {
  migrateAdminAgentSchema,
  generateUniqueAgentUid,
  mapAgentStatusForUi,
  mapAgentStatusForDb,
  getAgentFinancialSummary,
  ensureActiveAgentAccount,
};
