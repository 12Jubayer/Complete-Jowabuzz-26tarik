import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { getSettlementWindowForSettings } from './agentSettlementBarService.js';
import { windowToSqlRange } from './agentCommissionCalcService.js';
import { getCommissionSettings as getGlobalCommissionSettings } from './commissionSettingsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPLETED_STATUSES = ['completed', 'approved'];
const MONTH_SQL = `MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`;

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function clampPercent(value, label = 'Percent') {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    const error = new Error(`${label} must be between 0 and 100`);
    error.statusCode = 400;
    throw error;
  }
  return Number(percent.toFixed(2));
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapePdfText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildSimplePdf(title, headers, rows) {
  const lineHeight = 13;
  let y = 780;
  const commands = [];

  commands.push(`BT /F1 16 Tf 50 ${y} Td (${escapePdfText(title)}) Tj ET`);
  y -= 28;
  commands.push(`BT /F1 10 Tf 50 ${y} Td (${escapePdfText(headers.join(' | '))}) Tj ET`);
  y -= lineHeight;

  for (const row of rows) {
    y -= lineHeight;
    if (y < 40) break;
    commands.push(`BT /F1 9 Tf 50 ${y} Td (${escapePdfText(row.join(' | '))}) Tj ET`);
  }

  const stream = commands.join('\n');
  const streamLength = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function mapSettingsRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    depositPercent: Number(row.deposit_percent),
    withdrawPercent: Number(row.withdraw_percent),
    settlementType: 'monthly',
    settlementDay: Number(row.settlement_day ?? 3),
    autoSettlement: Boolean(Number(row.auto_settlement ?? 1)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCommissionRow(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name || '',
    agentMobile: row.agent_mobile || '',
    playerId: row.player_id,
    playerName: row.player_name || row.player_phone || '',
    transactionId: row.transaction_id,
    type: row.type,
    amount: Number(row.amount),
    rate: Number(row.rate),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    createdAt: row.created_at,
  };
}

async function getCommissionSettingsRow(db) {
  const [[row]] = await db.query(
    `SELECT id, deposit_percent, withdraw_percent, settlement_type, settlement_day, auto_settlement, created_at, updated_at
     FROM agent_commission_settings
     ORDER BY id ASC
     LIMIT 1`,
  );

  if (row) return row;

  await db.query(
    `INSERT INTO agent_commission_settings (deposit_percent, withdraw_percent, settlement_type, settlement_day, auto_settlement)
     VALUES (5, 2, 'weekly', 0, 1)`,
  );

  const [[created]] = await db.query(
    `SELECT id, deposit_percent, withdraw_percent, created_at, updated_at
     FROM agent_commission_settings
     ORDER BY id DESC
     LIMIT 1`,
  );

  return created;
}

export async function migrateAgentCommissionSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'agent_commission.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(sql)) {
    await pool.query(statement);
  }

  await getCommissionSettingsRow(pool);
  await backfillMissingCommissions(pool);
}

async function backfillMissingCommissions(db) {
  const [rows] = await db.query(
    `SELECT at.id
     FROM agent_transactions at
     LEFT JOIN agent_commissions ac ON ac.transaction_id = at.id
     WHERE ac.id IS NULL
       AND at.status IN ('completed', 'approved')
       AND (
         (at.type = 'topup_player' AND at.user_id IS NOT NULL)
         OR (at.type = 'withdraw' AND at.user_id IS NOT NULL)
       )
     ORDER BY at.id ASC`,
  );

  for (const row of rows) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await processAgentCommission(connection, row.id);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Backfill commission failed for transaction ${row.id}:`, error.message);
    } finally {
      connection.release();
    }
  }
}

export async function getCommissionSettings() {
  const pool = getPool();
  const row = await getCommissionSettingsRow(pool);
  return mapSettingsRow(row);
}

export async function updateCommissionSettings(payload = {}) {
  const pool = getPool();
  const depositPercent = clampPercent(payload.depositPercent, 'Deposit percent');
  const withdrawPercent = clampPercent(payload.withdrawPercent, 'Withdraw percent');
  const existing = await getCommissionSettingsRow(pool);

  const fields = ['deposit_percent = ?', 'withdraw_percent = ?'];
  const values = [depositPercent, withdrawPercent];

  if (payload.settlementType !== undefined || payload.settlement_type !== undefined) {
    const settlementType = String(payload.settlementType || payload.settlement_type || 'weekly').toLowerCase();
    fields.push('settlement_type = ?');
    values.push('monthly');
  }

  if (payload.settlementDay !== undefined || payload.settlement_day !== undefined) {
    const settlementDay = Number(payload.settlementDay ?? payload.settlement_day);
    if (!Number.isInteger(settlementDay) || settlementDay < 1 || settlementDay > 31) {
      const error = new Error('Monthly settlement day must be between 1 and 31');
      error.statusCode = 400;
      throw error;
    }
    fields.push('settlement_day = ?');
    values.push(settlementDay);
  }

  if (payload.autoSettlement !== undefined || payload.auto_settlement !== undefined) {
    fields.push('auto_settlement = ?');
    values.push(payload.autoSettlement || payload.auto_settlement ? 1 : 0);
  }

  values.push(existing.id);

  await pool.query(
    `UPDATE agent_commission_settings SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  return getCommissionSettings();
}

export async function processAgentCommission(connection, agentTransactionId) {
  const [[tx]] = await connection.query(
    `SELECT id, agent_id, user_id, type, amount, status
     FROM agent_transactions
     WHERE id = ?
     FOR UPDATE`,
    [agentTransactionId],
  );

  if (!tx || !COMPLETED_STATUSES.includes(tx.status)) {
    return null;
  }

  let commissionType = null;
  if (tx.type === 'topup_player' && tx.user_id) {
    commissionType = 'deposit';
  } else if (tx.type === 'withdraw' && tx.user_id) {
    commissionType = 'withdraw';
  } else {
    return null;
  }

  const [[existing]] = await connection.query(
    `SELECT id FROM agent_commissions WHERE transaction_id = ? LIMIT 1`,
    [agentTransactionId],
  );

  if (existing) {
    return existing.id;
  }

  const agentSettingsRow = await getCommissionSettingsRow(connection);
  const rate =
    commissionType === 'deposit'
      ? Number(agentSettingsRow.deposit_percent)
      : Number(agentSettingsRow.withdraw_percent);
  const amount = Number(tx.amount);
  const commissionAmount = Number(((amount * rate) / 100).toFixed(2));
  const [insertResult] = await connection.query(
    `INSERT INTO agent_commissions
       (agent_id, player_id, transaction_id, type, amount, rate, commission_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [tx.agent_id, tx.user_id, agentTransactionId, commissionType, amount, rate, commissionAmount],
  );

  return insertResult.insertId;
}

export async function getAgentCommissionSummary() {
  const pool = getPool();
  const settings = await getCommissionSettings();
  const settlementSettings = {
    settlement_day: settings.settlementDay,
    auto_settlement: settings.autoSettlement,
  };
  const window = getSettlementWindowForSettings(settlementSettings, new Date(), 'open');
  const { periodStartSql, periodEndSql } = windowToSqlRange(window);

  const [[agentCountRow]] = await pool.query(`SELECT COUNT(*) AS count FROM agents WHERE status = 'active'`);
  const [[monthDepositRow]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM agent_transactions
     WHERE type = 'topup_player'
       AND user_id IS NOT NULL
       AND status IN ('completed', 'approved')
       AND created_at >= ?
       AND created_at <= ?`,
    [periodStartSql, periodEndSql],
  );
  const [[monthWithdrawRow]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM agent_transactions
     WHERE type = 'withdraw'
       AND user_id IS NOT NULL
       AND status IN ('completed', 'approved')
       AND created_at >= ?
       AND created_at <= ?`,
    [periodStartSql, periodEndSql],
  );

  const monthDeposit = Number(monthDepositRow.total || 0);
  const monthWithdraw = Number(monthWithdrawRow.total || 0);
  const totalCommission = Number(
    (
      (monthDeposit * settings.depositPercent) / 100 +
      (monthWithdraw * settings.withdrawPercent) / 100
    ).toFixed(2),
  );

  const [[pendingRow]] = await pool.query(
    `SELECT COALESCE(SUM(total_commission), 0) AS total
     FROM agent_commission_settlements
     WHERE status = 'pending'`,
  );
  const [[settledRow]] = await pool.query(
    `SELECT COALESCE(SUM(total_commission), 0) AS total
     FROM agent_commission_settlements
     WHERE status = 'approved'`,
  );

  return {
    agents: Number(agentCountRow.count || 0),
    monthDeposit,
    monthWithdraw,
    totalCommission,
    pendingCommission: Number(pendingRow.total || 0),
    settledCommission: Number(settledRow.total || 0),
    settlementType: 'monthly',
    periodStart: window.startDate,
    periodEnd: window.endDate,
  };
}

function buildSearchClause(search, aliasPrefix = '') {
  const term = String(search || '').trim();
  if (!term) {
    return { clause: '', params: [] };
  }

  const like = `%${term}%`;
  const prefix = aliasPrefix ? `${aliasPrefix}.` : '';

  return {
    clause: `AND (
      ${prefix}name LIKE ?
      OR ${prefix}mobile LIKE ?
      OR CAST(${prefix}id AS CHAR) LIKE ?
    )`,
    params: [like, like, like],
  };
}

export async function listAgentCommissionAgents({ search = '' } = {}) {
  const pool = getPool();
  const settings = await getCommissionSettings();
  const searchInfo = buildSearchClause(search, 'a');
  const settlementSettings = {
    settlement_day: settings.settlementDay,
    auto_settlement: settings.autoSettlement,
  };
  const window = getSettlementWindowForSettings(settlementSettings, new Date(), 'open');
  const { periodStartSql, periodEndSql } = windowToSqlRange(window);

  const [rows] = await pool.query(
    `SELECT
       a.id,
       a.name,
       a.mobile,
       a.balance,
       a.role,
       COALESCE((
         SELECT SUM(at.amount)
         FROM agent_transactions at
         WHERE at.agent_id = a.id
           AND at.type = 'topup_player'
           AND at.user_id IS NOT NULL
           AND at.status IN ('completed', 'approved')
           AND at.created_at >= ?
           AND at.created_at <= ?
       ), 0) AS month_deposit,
       COALESCE((
         SELECT SUM(at.amount)
         FROM agent_transactions at
         WHERE at.agent_id = a.id
           AND at.type = 'withdraw'
           AND at.user_id IS NOT NULL
           AND at.status IN ('completed', 'approved')
           AND at.created_at >= ?
           AND at.created_at <= ?
       ), 0) AS month_withdraw,
       COALESCE((
         (
           SELECT COALESCE(SUM(at.amount), 0)
           FROM agent_transactions at
           WHERE at.agent_id = a.id
             AND at.type = 'topup_player'
             AND at.user_id IS NOT NULL
             AND at.status IN ('completed', 'approved')
             AND at.created_at >= ?
             AND at.created_at <= ?
         ) * ? / 100
       ), 0) + COALESCE((
         (
           SELECT COALESCE(SUM(at.amount), 0)
           FROM agent_transactions at
           WHERE at.agent_id = a.id
             AND at.type = 'withdraw'
             AND at.user_id IS NOT NULL
             AND at.status IN ('completed', 'approved')
             AND at.created_at >= ?
             AND at.created_at <= ?
         ) * ? / 100
       ), 0) AS commission
     FROM agents a
     WHERE 1 = 1
     ${searchInfo.clause}
     ORDER BY a.name ASC`,
    [
      periodStartSql,
      periodEndSql,
      periodStartSql,
      periodEndSql,
      periodStartSql,
      periodEndSql,
      settings.depositPercent,
      periodStartSql,
      periodEndSql,
      settings.withdrawPercent,
      ...searchInfo.params,
    ],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    role: row.role,
    balance: Number(row.balance),
    monthDeposit: Number(row.month_deposit),
    monthWithdraw: Number(row.month_withdraw),
    depositRate: settings.depositPercent,
    withdrawRate: settings.withdrawPercent,
    commission: Number(Number(row.commission).toFixed(2)),
    periodStart: window.startDate,
    periodEnd: window.endDate,
  }));
}

export async function listAgentCommissionTransactions({
  search = '',
  type = 'all',
} = {}) {
  const pool = getPool();
  const params = [];
  let typeClause = '';

  if (type === 'deposit' || type === 'withdraw') {
    typeClause = 'AND ac.type = ?';
    params.push(type);
  }

  const searchTerm = String(search || '').trim();
  let searchClause = '';
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    searchClause = `AND (
      a.name LIKE ?
      OR a.mobile LIKE ?
      OR u.name LIKE ?
      OR u.phone LIKE ?
      OR CAST(ac.id AS CHAR) LIKE ?
    )`;
    params.push(like, like, like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT
       ac.id,
       ac.agent_id,
       ac.player_id,
       ac.transaction_id,
       ac.type,
       ac.amount,
       ac.rate,
       ac.commission_amount,
       ac.status,
       ac.created_at,
       a.name AS agent_name,
       a.mobile AS agent_mobile,
       u.name AS player_name,
       u.phone AS player_phone
     FROM agent_commissions ac
     INNER JOIN agents a ON a.id = ac.agent_id
     LEFT JOIN users u ON u.id = ac.player_id
     WHERE 1 = 1
     ${typeClause}
     ${searchClause}
     ORDER BY ac.created_at DESC
     LIMIT 500`,
    params,
  );

  return rows.map(mapCommissionRow);
}

export async function listAgentOwnCommissions(agentId, { limit = 100 } = {}) {
  const pool = getPool();
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const [rows] = await pool.query(
    `SELECT
       ac.id,
       ac.agent_id,
       ac.player_id,
       ac.transaction_id,
       ac.type,
       ac.amount,
       ac.rate,
       ac.commission_amount,
       ac.status,
       ac.created_at,
       a.name AS agent_name,
       a.mobile AS agent_mobile,
       u.name AS player_name,
       u.phone AS player_phone
     FROM agent_commissions ac
     INNER JOIN agents a ON a.id = ac.agent_id
     LEFT JOIN users u ON u.id = ac.player_id
     WHERE ac.agent_id = ?
     ORDER BY ac.created_at DESC
     LIMIT ?`,
    [agentId, safeLimit],
  );

  const [[summary]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN ${MONTH_SQL} THEN commission_amount ELSE 0 END), 0) AS month_commission,
       COALESCE(SUM(commission_amount), 0) AS total_commission,
       COALESCE(SUM(CASE WHEN status = 'pending' AND settlement_id IS NULL THEN commission_amount ELSE 0 END), 0) AS unsettled_commission
     FROM agent_commissions
     WHERE agent_id = ?`,
    [agentId],
  );

  const [[pendingSettlement]] = await pool.query(
    `SELECT COALESCE(SUM(total_commission), 0) AS total
     FROM agent_commission_settlements
     WHERE agent_id = ? AND status = 'pending'`,
    [agentId],
  );

  const [[agentRow]] = await pool.query(
    `SELECT balance FROM agents WHERE id = ? LIMIT 1`,
    [agentId],
  );

  return {
    balance: Number(agentRow?.balance || 0),
    pendingSettlementTotal:
      Number(pendingSettlement.total || 0) + Number(summary.unsettled_commission || 0),
    monthCommission: Number(summary.month_commission || 0),
    totalCommission: Number(summary.total_commission || 0),
    commissions: rows.map(mapCommissionRow),
  };
}

function buildAgentsExportRows(agents) {
  return agents.map((agent) => [
    agent.name,
    agent.mobile || '',
    agent.role,
    agent.balance.toFixed(2),
    agent.monthDeposit.toFixed(2),
    agent.monthWithdraw.toFixed(2),
    `${agent.depositRate}% / ${agent.withdrawRate}%`,
    agent.commission.toFixed(2),
  ]);
}

function buildTransactionsExportRows(transactions) {
  return transactions.map((row) => [
    new Date(row.createdAt).toLocaleString(),
    row.agentName,
    row.playerName,
    row.type === 'deposit' ? 'Deposit' : 'Withdraw',
    row.amount.toFixed(2),
    `${row.rate}%`,
    row.commissionAmount.toFixed(2),
  ]);
}

export async function exportAgentCommissionCsv({ tab = 'agents', search = '', type = 'all' } = {}) {
  if (tab === 'transactions') {
    const transactions = await listAgentCommissionTransactions({ search, type });
    const headers = ['Date', 'Agent', 'Player', 'Type', 'Amount', 'Rate', 'Commission'];
    const lines = [
      headers.map(escapeCsv).join(','),
      ...buildTransactionsExportRows(transactions).map((row) => row.map(escapeCsv).join(',')),
    ];
    return {
      filename: 'agent-commission-transactions.csv',
      content: `\uFEFF${lines.join('\n')}`,
    };
  }

  const agents = await listAgentCommissionAgents({ search });
  const headers = [
    'Agent',
    'Mobile',
    'Role',
    'Balance',
    'Month Deposit',
    'Month Withdraw',
    'Rate (D/W)',
    'Commission',
  ];
  const lines = [
    headers.map(escapeCsv).join(','),
    ...buildAgentsExportRows(agents).map((row) => row.map(escapeCsv).join(',')),
  ];

  return {
    filename: 'agent-commission-agents.csv',
    content: `\uFEFF${lines.join('\n')}`,
  };
}

export async function exportAgentCommissionPdf({ tab = 'agents', search = '', type = 'all' } = {}) {
  if (tab === 'transactions') {
    const transactions = await listAgentCommissionTransactions({ search, type });
    const headers = ['Date', 'Agent', 'Player', 'Type', 'Amount', 'Rate', 'Commission'];
    const rows = buildTransactionsExportRows(transactions);
    return {
      filename: 'agent-commission-transactions.pdf',
      content: buildSimplePdf('Agent Commission — Transactions', headers, rows),
    };
  }

  const agents = await listAgentCommissionAgents({ search });
  const headers = ['Agent', 'Mobile', 'Role', 'Balance', 'Month Dep', 'Month Wdr', 'Rate', 'Commission'];
  const rows = buildAgentsExportRows(agents);
  return {
    filename: 'agent-commission-agents.pdf',
    content: buildSimplePdf('Agent Commission — Agents', headers, rows),
  };
}

export default {
  migrateAgentCommissionSchema,
  getCommissionSettings,
  updateCommissionSettings,
  processAgentCommission,
  getAgentCommissionSummary,
  listAgentCommissionAgents,
  listAgentCommissionTransactions,
  listAgentOwnCommissions,
  exportAgentCommissionCsv,
  exportAgentCommissionPdf,
};
