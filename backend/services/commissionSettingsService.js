import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_COMMISSION_SETTINGS = {
  agentDepositPercent: 5,
  agentWithdrawPercent: 2,
  affiliateDepositPercent: 25,
  affiliateWithdrawPercent: 0,
  superAffiliateDepositPercent: 10,
  superAffiliateWithdrawPercent: 0,
  settlementDay: 3,
  superAffiliateSettlementDay: 3,
  autoSettlement: false,
  manualApproval: true,
  affiliateWeeklySettlement: true,
  affiliateManualApproval: true,
};

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function clampPercent(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    const error = new Error(`${label} must be between 0 and 100`);
    error.statusCode = 400;
    throw error;
  }
  return Number(num.toFixed(2));
}

function clampDay(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || num > 28) {
    const error = new Error(`${label} must be between 1 and 28`);
    error.statusCode = 400;
    throw error;
  }
  return Math.floor(num);
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
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
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function mapSettingsRow(row) {
  if (!row) return { ...DEFAULT_COMMISSION_SETTINGS };
  return {
    id: row.id,
    agentDepositPercent: Number(row.agent_deposit_percent),
    agentWithdrawPercent: Number(row.agent_withdraw_percent),
    affiliateDepositPercent: Number(row.affiliate_deposit_percent),
    affiliateWithdrawPercent: Number(row.affiliate_withdraw_percent),
    superAffiliateDepositPercent: Number(row.super_affiliate_deposit_percent),
    superAffiliateWithdrawPercent: Number(row.super_affiliate_withdraw_percent),
    settlementDay: Number(row.settlement_day),
    superAffiliateSettlementDay: Number(row.super_affiliate_settlement_day),
    autoSettlement: Boolean(row.auto_settlement),
    manualApproval: Boolean(row.manual_approval),
    affiliateWeeklySettlement: Boolean(row.affiliate_weekly_settlement),
    affiliateManualApproval: Boolean(row.affiliate_manual_approval),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeSettingsPayload(payload = {}) {
  return {
    agentDepositPercent: clampPercent(
      payload.agentDepositPercent ?? payload.agent_deposit_percent ?? DEFAULT_COMMISSION_SETTINGS.agentDepositPercent,
      'Agent deposit commission',
    ),
    agentWithdrawPercent: clampPercent(
      payload.agentWithdrawPercent ?? payload.agent_withdraw_percent ?? DEFAULT_COMMISSION_SETTINGS.agentWithdrawPercent,
      'Agent withdraw commission',
    ),
    affiliateDepositPercent: clampPercent(
      payload.affiliateDepositPercent ?? payload.affiliate_deposit_percent ?? DEFAULT_COMMISSION_SETTINGS.affiliateDepositPercent,
      'Affiliate deposit commission',
    ),
    affiliateWithdrawPercent: clampPercent(
      payload.affiliateWithdrawPercent ?? payload.affiliate_withdraw_percent ?? DEFAULT_COMMISSION_SETTINGS.affiliateWithdrawPercent,
      'Affiliate withdraw commission',
    ),
    superAffiliateDepositPercent: clampPercent(
      payload.superAffiliateDepositPercent ?? payload.super_affiliate_deposit_percent ?? DEFAULT_COMMISSION_SETTINGS.superAffiliateDepositPercent,
      'Super affiliate deposit commission',
    ),
    superAffiliateWithdrawPercent: clampPercent(
      payload.superAffiliateWithdrawPercent ?? payload.super_affiliate_withdraw_percent ?? DEFAULT_COMMISSION_SETTINGS.superAffiliateWithdrawPercent,
      'Super affiliate withdraw commission',
    ),
    settlementDay: clampDay(
      payload.settlementDay ?? payload.settlement_day ?? DEFAULT_COMMISSION_SETTINGS.settlementDay,
      'Agent settlement day',
    ),
    superAffiliateSettlementDay: clampDay(
      payload.superAffiliateSettlementDay ?? payload.super_affiliate_settlement_day ?? DEFAULT_COMMISSION_SETTINGS.superAffiliateSettlementDay,
      'Super affiliate settlement day',
    ),
    autoSettlement: toBool(payload.autoSettlement ?? payload.auto_settlement, DEFAULT_COMMISSION_SETTINGS.autoSettlement),
    manualApproval: toBool(payload.manualApproval ?? payload.manual_approval, DEFAULT_COMMISSION_SETTINGS.manualApproval),
    affiliateWeeklySettlement: toBool(
      payload.affiliateWeeklySettlement ?? payload.affiliate_weekly_settlement,
      DEFAULT_COMMISSION_SETTINGS.affiliateWeeklySettlement,
    ),
    affiliateManualApproval: toBool(
      payload.affiliateManualApproval ?? payload.affiliate_manual_approval,
      DEFAULT_COMMISSION_SETTINGS.affiliateManualApproval,
    ),
  };
}

async function getSettingsRow(db) {
  const [[row]] = await db.query(
    `SELECT * FROM commission_settings ORDER BY id ASC LIMIT 1`,
  );
  if (row) return row;

  await db.query(
    `INSERT INTO commission_settings (
       agent_deposit_percent, agent_withdraw_percent,
       affiliate_deposit_percent, affiliate_withdraw_percent,
       super_affiliate_deposit_percent, super_affiliate_withdraw_percent,
       settlement_day, super_affiliate_settlement_day,
       auto_settlement, manual_approval,
       affiliate_weekly_settlement, affiliate_manual_approval
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      DEFAULT_COMMISSION_SETTINGS.agentDepositPercent,
      DEFAULT_COMMISSION_SETTINGS.agentWithdrawPercent,
      DEFAULT_COMMISSION_SETTINGS.affiliateDepositPercent,
      DEFAULT_COMMISSION_SETTINGS.affiliateWithdrawPercent,
      DEFAULT_COMMISSION_SETTINGS.superAffiliateDepositPercent,
      DEFAULT_COMMISSION_SETTINGS.superAffiliateWithdrawPercent,
      DEFAULT_COMMISSION_SETTINGS.settlementDay,
      DEFAULT_COMMISSION_SETTINGS.superAffiliateSettlementDay,
      DEFAULT_COMMISSION_SETTINGS.autoSettlement ? 1 : 0,
      DEFAULT_COMMISSION_SETTINGS.manualApproval ? 1 : 0,
      DEFAULT_COMMISSION_SETTINGS.affiliateWeeklySettlement ? 1 : 0,
      DEFAULT_COMMISSION_SETTINGS.affiliateManualApproval ? 1 : 0,
    ],
  );

  const [[created]] = await db.query(
    `SELECT * FROM commission_settings ORDER BY id DESC LIMIT 1`,
  );
  return created;
}

export async function migrateCommissionSettingsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'commission_settings.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(sql)) {
    await pool.query(statement);
  }
  const row = await getSettingsRow(pool);
  await syncLegacyTables(mapSettingsRow(row));
}

export async function syncLegacyTables(settings) {
  const pool = getPool();

  const [[agentSettings]] = await pool.query(
    `SELECT id FROM agent_commission_settings ORDER BY id ASC LIMIT 1`,
  );
  if (agentSettings) {
    await pool.query(
      `UPDATE agent_commission_settings
       SET deposit_percent = ?, withdraw_percent = ?
       WHERE id = ?`,
      [settings.agentDepositPercent, settings.agentWithdrawPercent, agentSettings.id],
    );
  } else {
    await pool.query(
      `INSERT INTO agent_commission_settings (deposit_percent, withdraw_percent)
       VALUES (?, ?)`,
      [settings.agentDepositPercent, settings.agentWithdrawPercent],
    );
  }

  const [[affiliateSettings]] = await pool.query(
    `SELECT id FROM affiliate_settings ORDER BY id ASC LIMIT 1`,
  );
  if (affiliateSettings) {
    await pool.query(
      `UPDATE affiliate_settings
       SET default_commission_percent = ?, settlement_day = ?, auto_settlement = ?
       WHERE id = ?`,
      [
        settings.affiliateDepositPercent,
        settings.affiliateWeeklySettlement ? 0 : 1,
        settings.affiliateWeeklySettlement ? 1 : 0,
        affiliateSettings.id,
      ],
    );
  } else {
    await pool.query(
      `INSERT INTO affiliate_settings (default_commission_percent, settlement_day, auto_settlement)
       VALUES (?, ?, ?)`,
      [
        settings.affiliateDepositPercent,
        settings.affiliateWeeklySettlement ? 0 : 1,
        settings.affiliateWeeklySettlement ? 1 : 0,
      ],
    );
  }
}

export async function getCommissionSettings() {
  const pool = getPool();
  const row = await getSettingsRow(pool);
  return mapSettingsRow(row);
}

export async function updateCommissionSettings(payload = {}) {
  const pool = getPool();
  const normalized = normalizeSettingsPayload(payload);
  const existing = await getSettingsRow(pool);

  await pool.query(
    `UPDATE commission_settings SET
       agent_deposit_percent = ?,
       agent_withdraw_percent = ?,
       affiliate_deposit_percent = ?,
       affiliate_withdraw_percent = ?,
       super_affiliate_deposit_percent = ?,
       super_affiliate_withdraw_percent = ?,
       settlement_day = ?,
       super_affiliate_settlement_day = ?,
       auto_settlement = ?,
       manual_approval = ?,
       affiliate_weekly_settlement = ?,
       affiliate_manual_approval = ?
     WHERE id = ?`,
    [
      normalized.agentDepositPercent,
      normalized.agentWithdrawPercent,
      normalized.affiliateDepositPercent,
      normalized.affiliateWithdrawPercent,
      normalized.superAffiliateDepositPercent,
      normalized.superAffiliateWithdrawPercent,
      normalized.settlementDay,
      normalized.superAffiliateSettlementDay,
      normalized.autoSettlement ? 1 : 0,
      normalized.manualApproval ? 1 : 0,
      normalized.affiliateWeeklySettlement ? 1 : 0,
      normalized.affiliateManualApproval ? 1 : 0,
      existing.id,
    ],
  );

  await syncLegacyTables(normalized);
  return getCommissionSettings();
}

export async function resetCommissionSettings() {
  return updateCommissionSettings(DEFAULT_COMMISSION_SETTINGS);
}

async function resolvePlayerAffiliateChain(connection, playerUserId) {
  const [[playerProfile]] = await connection.query(
    `SELECT referred_by FROM affiliate_profiles WHERE user_id = ? LIMIT 1`,
    [playerUserId],
  );
  if (!playerProfile?.referred_by) {
    return { affiliateId: null, superAffiliateId: null };
  }

  const affiliateId = playerProfile.referred_by;
  const [[affiliateProfile]] = await connection.query(
    `SELECT referred_by, status FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );

  if (!affiliateProfile || affiliateProfile.status !== 'approved') {
    return { affiliateId: null, superAffiliateId: null };
  }

  let superAffiliateId = null;
  if (affiliateProfile.referred_by) {
    const [[superProfile]] = await connection.query(
      `SELECT id, status FROM affiliate_profiles WHERE id = ? LIMIT 1`,
      [affiliateProfile.referred_by],
    );
    if (superProfile?.status === 'approved') {
      superAffiliateId = superProfile.id;
    }
  }

  return { affiliateId, superAffiliateId };
}

async function insertCommissionRecord(connection, {
  roleType,
  beneficiaryId,
  playerId,
  transactionId,
  commissionType,
  baseAmount,
  rate,
  commissionAmount,
  autoApprove,
}) {
  const status = autoApprove ? 'approved' : 'pending';
  const [result] = await connection.query(
    `INSERT INTO commission_records
       (role_type, beneficiary_id, player_id, transaction_id, commission_type,
        base_amount, rate, commission_amount, status, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      roleType,
      beneficiaryId,
      playerId,
      transactionId,
      commissionType,
      baseAmount,
      rate,
      commissionAmount,
      status,
      autoApprove ? new Date() : null,
    ],
  );

  if (autoApprove && result.affectedRows > 0) {
    await creditAffiliateCommission(connection, beneficiaryId, commissionAmount);
  }

  return result.insertId || null;
}

async function creditAffiliateCommission(connection, affiliateId, amount) {
  await connection.query(
    `UPDATE affiliate_profiles
     SET settled_commission = settled_commission + ?,
         total_commission = total_commission + ?,
         pending_commission = GREATEST(pending_commission - ?, 0)
     WHERE id = ?`,
    [amount, amount, amount, affiliateId],
  );
}

async function creditAgentCommission(connection, agentId, amount, referenceId) {
  await connection.query(
    `UPDATE agents SET balance = balance + ? WHERE id = ?`,
    [amount, agentId],
  );
  await connection.query(
    `INSERT INTO agent_wallet_ledger (agent_id, type, amount, reference_type, reference_id, description)
     VALUES (?, 'commission_credit', ?, 'agent_commission', ?, 'Commission approved')`,
    [agentId, amount, referenceId],
  );
}

export async function processAffiliateCommissionsForTransaction(connection, transactionId) {
  const [[tx]] = await connection.query(
    `SELECT id, user_id, type, amount, status
     FROM transactions
     WHERE id = ?
     FOR UPDATE`,
    [transactionId],
  );

  if (!tx || tx.status !== 'approved') return null;
  if (tx.type !== 'deposit' && tx.type !== 'withdraw') return null;

  const settings = mapSettingsRow(await getSettingsRow(connection));
  const { affiliateId, superAffiliateId } = await resolvePlayerAffiliateChain(connection, tx.user_id);
  if (!affiliateId) return null;

  const commissionType = tx.type;
  const baseAmount = Number(tx.amount);
  const results = [];

  const affiliateRate =
    commissionType === 'deposit'
      ? settings.affiliateDepositPercent
      : settings.affiliateWithdrawPercent;

  if (affiliateRate > 0) {
    const affiliateAmount = Number(((baseAmount * affiliateRate) / 100).toFixed(2));
    if (affiliateAmount > 0) {
      const autoApprove = !settings.affiliateManualApproval;
      const id = await insertCommissionRecord(connection, {
        roleType: 'affiliate',
        beneficiaryId: affiliateId,
        playerId: tx.user_id,
        transactionId: tx.id,
        commissionType,
        baseAmount,
        rate: affiliateRate,
        commissionAmount: affiliateAmount,
        autoApprove,
      });
      if (id) {
        if (!autoApprove) {
          await connection.query(
            `UPDATE affiliate_profiles SET pending_commission = pending_commission + ? WHERE id = ?`,
            [affiliateAmount, affiliateId],
          );
        }
        results.push({ roleType: 'affiliate', id, amount: affiliateAmount });
      }
    }
  }

  if (superAffiliateId) {
    const superRate =
      commissionType === 'deposit'
        ? settings.superAffiliateDepositPercent
        : settings.superAffiliateWithdrawPercent;

    if (superRate > 0) {
      const superAmount = Number(((baseAmount * superRate) / 100).toFixed(2));
      if (superAmount > 0) {
        const autoApprove = !settings.affiliateManualApproval;
        const id = await insertCommissionRecord(connection, {
          roleType: 'super_affiliate',
          beneficiaryId: superAffiliateId,
          playerId: tx.user_id,
          transactionId: tx.id,
          commissionType,
          baseAmount,
          rate: superRate,
          commissionAmount: superAmount,
          autoApprove,
        });
        if (id) {
          if (!autoApprove) {
            await connection.query(
              `UPDATE affiliate_profiles SET pending_commission = pending_commission + ? WHERE id = ?`,
              [superAmount, superAffiliateId],
            );
          }
          results.push({ roleType: 'super_affiliate', id, amount: superAmount });
        }
      }
    }
  }

  return results;
}

function buildRecordFilters({ status, role, search, startDate, endDate } = {}) {
  const agentFilters = [];
  const agentParams = [];
  const affiliateFilters = [];
  const affiliateParams = [];

  const normalizedStatus = String(status || 'all').trim().toLowerCase();
  if (normalizedStatus && normalizedStatus !== 'all') {
    agentFilters.push('ac.status = ?');
    agentParams.push(normalizedStatus);
    affiliateFilters.push('cr.status = ?');
    affiliateParams.push(normalizedStatus);
  }

  const normalizedRole = String(role || 'all').trim().toLowerCase();
  const includeAgent = normalizedRole === 'all' || normalizedRole === 'agent';
  const includeAffiliate = normalizedRole === 'all' || normalizedRole === 'affiliate';
  const includeSuperAffiliate = normalizedRole === 'all' || normalizedRole === 'super_affiliate';

  if (normalizedRole === 'affiliate') {
    affiliateFilters.push(`cr.role_type = 'affiliate'`);
  } else if (normalizedRole === 'super_affiliate') {
    affiliateFilters.push(`cr.role_type = 'super_affiliate'`);
  }

  const start = String(startDate || '').trim();
  if (start) {
    agentFilters.push('DATE(ac.created_at) >= ?');
    agentParams.push(start);
    affiliateFilters.push('DATE(cr.created_at) >= ?');
    affiliateParams.push(start);
  }

  const end = String(endDate || '').trim();
  if (end) {
    agentFilters.push('DATE(ac.created_at) <= ?');
    agentParams.push(end);
    affiliateFilters.push('DATE(cr.created_at) <= ?');
    affiliateParams.push(end);
  }

  const term = String(search || '').trim();
  if (term) {
    const like = `%${term}%`;
    agentFilters.push(`(
      a.name LIKE ? OR a.mobile LIKE ?
      OR u.name LIKE ? OR u.phone LIKE ?
      OR CAST(ac.id AS CHAR) LIKE ?
    )`);
    agentParams.push(like, like, like, like, like);

    affiliateFilters.push(`(
      u.name LIKE ? OR u.phone LIKE ?
      OR au.name LIKE ? OR au.phone LIKE ?
      OR CAST(cr.id AS CHAR) LIKE ?
    )`);
    affiliateParams.push(like, like, like, like, like);
  }

  return {
    includeAgent,
    includeAffiliate,
    includeSuperAffiliate,
    agentWhere: agentFilters.length ? `AND ${agentFilters.join(' AND ')}` : '',
    agentParams,
    affiliateWhere: affiliateFilters.length ? `AND ${affiliateFilters.join(' AND ')}` : '',
    affiliateParams,
  };
}

function mapUnifiedRecord(row) {
  return {
    id: row.record_id,
    source: row.source,
    roleType: row.role_type,
    beneficiaryId: row.beneficiary_id,
    beneficiaryName: row.beneficiary_name || '',
    beneficiaryMobile: row.beneficiary_mobile || '',
    playerId: row.player_id,
    playerName: row.player_name || row.player_phone || '',
    transactionId: row.transaction_id,
    commissionType: row.commission_type,
    baseAmount: Number(row.base_amount),
    rate: Number(row.rate),
    commissionAmount: Number(row.commission_amount),
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
}

export async function listCommissionRecords(filters = {}) {
  const pool = getPool();
  const built = buildRecordFilters(filters);
  const parts = [];
  const params = [];

  if (built.includeAgent) {
    parts.push(`
      SELECT
        'agent' AS source,
        ac.id AS record_id,
        'agent' AS role_type,
        ac.agent_id AS beneficiary_id,
        a.name AS beneficiary_name,
        a.mobile AS beneficiary_mobile,
        ac.player_id,
        u.name AS player_name,
        u.phone AS player_phone,
        ac.transaction_id,
        ac.type AS commission_type,
        ac.amount AS base_amount,
        ac.rate,
        ac.commission_amount,
        ac.status,
        NULL AS approved_at,
        NULL AS rejected_at,
        ac.created_at
      FROM agent_commissions ac
      INNER JOIN agents a ON a.id = ac.agent_id
      LEFT JOIN users u ON u.id = ac.player_id
      WHERE 1 = 1
      ${built.agentWhere}
    `);
    params.push(...built.agentParams);
  }

  if (built.includeAffiliate || built.includeSuperAffiliate) {
    parts.push(`
      SELECT
        'record' AS source,
        cr.id AS record_id,
        cr.role_type,
        cr.beneficiary_id,
        au.name AS beneficiary_name,
        au.phone AS beneficiary_mobile,
        cr.player_id,
        u.name AS player_name,
        u.phone AS player_phone,
        cr.transaction_id,
        cr.commission_type,
        cr.base_amount,
        cr.rate,
        cr.commission_amount,
        cr.status,
        cr.approved_at,
        cr.rejected_at,
        cr.created_at
      FROM commission_records cr
      INNER JOIN affiliate_profiles ap ON ap.id = cr.beneficiary_id
      INNER JOIN users au ON au.id = ap.user_id
      LEFT JOIN users u ON u.id = cr.player_id
      WHERE 1 = 1
      ${built.affiliateWhere}
    `);
    params.push(...built.affiliateParams);
  }

  if (!parts.length) return [];

  const [rows] = await pool.query(
    `${parts.join(' UNION ALL ')} ORDER BY created_at DESC LIMIT 500`,
    params,
  );

  return rows.map(mapUnifiedRecord);
}

export async function approveCommissionRecord(source, recordId, adminId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (source === 'agent') {
      const [[row]] = await connection.query(
        `SELECT id, agent_id, commission_amount, status
         FROM agent_commissions WHERE id = ? FOR UPDATE`,
        [recordId],
      );
      if (!row) {
        const error = new Error('Commission record not found');
        error.statusCode = 404;
        throw error;
      }
      if (row.status === 'approved') {
        const error = new Error('Commission already approved');
        error.statusCode = 400;
        throw error;
      }
      if (row.status === 'rejected') {
        const error = new Error('Rejected commission cannot be approved');
        error.statusCode = 400;
        throw error;
      }

      await connection.query(
        `UPDATE agent_commissions SET status = 'approved' WHERE id = ?`,
        [recordId],
      );
      await creditAgentCommission(connection, row.agent_id, Number(row.commission_amount), row.id);
    } else {
      const [[row]] = await connection.query(
        `SELECT id, beneficiary_id, commission_amount, status, role_type
         FROM commission_records WHERE id = ? FOR UPDATE`,
        [recordId],
      );
      if (!row) {
        const error = new Error('Commission record not found');
        error.statusCode = 404;
        throw error;
      }
      if (row.status === 'approved') {
        const error = new Error('Commission already approved');
        error.statusCode = 400;
        throw error;
      }
      if (row.status === 'rejected') {
        const error = new Error('Rejected commission cannot be approved');
        error.statusCode = 400;
        throw error;
      }

      await connection.query(
        `UPDATE commission_records
         SET status = 'approved', approved_by = ?, approved_at = NOW()
         WHERE id = ?`,
        [adminId || null, recordId],
      );
      await creditAffiliateCommission(connection, row.beneficiary_id, Number(row.commission_amount));
    }

    await connection.commit();
    return { success: true, message: 'Commission approved' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectCommissionRecord(source, recordId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (source === 'agent') {
      const [[row]] = await connection.query(
        `SELECT id, commission_amount, status FROM agent_commissions WHERE id = ? FOR UPDATE`,
        [recordId],
      );
      if (!row) {
        const error = new Error('Commission record not found');
        error.statusCode = 404;
        throw error;
      }
      if (row.status !== 'pending') {
        const error = new Error('Only pending commissions can be rejected');
        error.statusCode = 400;
        throw error;
      }
      await connection.query(
        `UPDATE agent_commissions SET status = 'rejected' WHERE id = ?`,
        [recordId],
      );
    } else {
      const [[row]] = await connection.query(
        `SELECT id, beneficiary_id, commission_amount, status
         FROM commission_records WHERE id = ? FOR UPDATE`,
        [recordId],
      );
      if (!row) {
        const error = new Error('Commission record not found');
        error.statusCode = 404;
        throw error;
      }
      if (row.status !== 'pending') {
        const error = new Error('Only pending commissions can be rejected');
        error.statusCode = 400;
        throw error;
      }
      await connection.query(
        `UPDATE commission_records SET status = 'rejected', rejected_at = NOW() WHERE id = ?`,
        [recordId],
      );
      await connection.query(
        `UPDATE affiliate_profiles
         SET pending_commission = GREATEST(pending_commission - ?, 0)
         WHERE id = ?`,
        [Number(row.commission_amount), row.beneficiary_id],
      );
    }

    await connection.commit();
    return { success: true, message: 'Commission rejected' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function exportCommissionRecordsCsv(filters = {}) {
  const records = await listCommissionRecords(filters);
  const headers = [
    'Date',
    'Role',
    'Beneficiary',
    'Player',
    'Type',
    'Base Amount',
    'Rate',
    'Commission',
    'Status',
  ];
  const lines = [
    headers.map(escapeCsv).join(','),
    ...records.map((row) =>
      [
        new Date(row.createdAt).toLocaleString(),
        row.roleType,
        row.beneficiaryName,
        row.playerName,
        row.commissionType,
        row.baseAmount.toFixed(2),
        `${row.rate}%`,
        row.commissionAmount.toFixed(2),
        row.status,
      ]
        .map(escapeCsv)
        .join(','),
    ),
  ];

  return {
    filename: 'commission-records.csv',
    content: `\uFEFF${lines.join('\n')}`,
  };
}

export async function exportCommissionRecordsPdf(filters = {}) {
  const records = await listCommissionRecords(filters);
  const headers = ['Date', 'Role', 'Beneficiary', 'Type', 'Commission', 'Status'];
  const rows = records.slice(0, 40).map((row) => [
    new Date(row.createdAt).toLocaleDateString(),
    row.roleType,
    row.beneficiaryName,
    row.commissionType,
    row.commissionAmount.toFixed(2),
    row.status,
  ]);

  return {
    filename: 'commission-records.pdf',
    content: buildSimplePdf('Commission Records', headers, rows),
  };
}

export default {
  migrateCommissionSettingsSchema,
  getCommissionSettings,
  updateCommissionSettings,
  resetCommissionSettings,
  processAffiliateCommissionsForTransaction,
  listCommissionRecords,
  approveCommissionRecord,
  rejectCommissionRecord,
  exportCommissionRecordsCsv,
  exportCommissionRecordsPdf,
};
