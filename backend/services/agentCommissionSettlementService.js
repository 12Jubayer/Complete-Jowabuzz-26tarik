import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import {
  getSettlementWindowForSettings,
  SETTLEMENT_TYPE,
} from './agentSettlementBarService.js';
import {
  calculateAgentTransactionTotals,
  resolveSettlementZeroReason,
  windowToSqlRange,
} from './agentCommissionCalcService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export { windowToSqlRange };

function formatPeriodLabel(window) {
  return window.dateRange || `${window.startDate} – ${window.endDate}`;
}

function mapSettlementRow(row) {
  const settlementType = row.settlement_type || SETTLEMENT_TYPE;
  const startDate = String(row.period_start || '').slice(0, 10);
  const endDate = String(row.period_end || '').slice(0, 10);

  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name || '',
    agentMobile: row.agent_mobile || '',
    agentBalance: Number(row.agent_balance || 0),
    settlementType,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    weekRange: `${startDate} → ${endDate}`,
    dateRange: `${startDate} – ${endDate}`,
    periodLabel: `${startDate} → ${endDate}`,
    totalDepositAmount: Number(row.total_deposit_amount || 0),
    totalWithdrawAmount: Number(row.total_withdraw_amount || 0),
    depositCommission: Number(row.deposit_commission),
    withdrawCommission: Number(row.withdraw_commission),
    totalCommission: Number(row.total_commission),
    status: row.status === 'approved' ? 'settled' : row.status,
    rawStatus: row.status,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name || null,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    balanceBefore: row.balance_before !== null ? Number(row.balance_before) : null,
    balanceAfter: row.balance_after !== null ? Number(row.balance_after) : null,
    walletTransactionId: row.wallet_transaction_id ? Number(row.wallet_transaction_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commissionCount: Number(row.commission_count || 0),
    creditTo: {
      type: 'agent_wallet',
      agentId: row.agent_id,
      agentName: row.agent_name || '',
      balance: Number(row.agent_balance || 0),
    },
    zeroReason: row.zero_reason || null,
  };
}

export async function getAgentSettlementSettings() {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT deposit_percent, withdraw_percent, settlement_type, settlement_day, auto_settlement
     FROM agent_commission_settings
     ORDER BY id ASC
     LIMIT 1`,
  );

  return {
    deposit_percent: Number(row?.deposit_percent ?? 5),
    withdraw_percent: Number(row?.withdraw_percent ?? 2),
    settlement_type: SETTLEMENT_TYPE,
    settlement_day: Number(row?.settlement_day ?? 3),
    auto_settlement: Number(row?.auto_settlement ?? 1),
  };
}

async function logAgentWalletTransaction(connection, payload) {
  const {
    agentId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    referenceType = null,
    referenceId = null,
    note = null,
    createdBy = null,
  } = payload;

  const [result] = await connection.query(
    `INSERT INTO agent_wallet_transactions
      (agent_id, type, amount, balance_before, balance_after, reference_type, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [agentId, type, amount, balanceBefore, balanceAfter, referenceType, referenceId, note, createdBy],
  );

  await connection.query(
    `INSERT INTO agent_wallet_ledger
      (agent_id, type, amount, reference_type, reference_id, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [agentId, type, amount, referenceType, referenceId, note || type],
  );

  return result.insertId;
}

export async function migrateAgentCommissionSettlementSchema() {
  const pool = getPool();

  for (const file of ['agent_settlement_type.sql', 'agent_settlement_cron_log.sql']) {
    const schemaPath = path.join(__dirname, '..', 'sql', file);
    if (!fs.existsSync(schemaPath)) continue;
    for (const statement of splitSqlStatements(fs.readFileSync(schemaPath, 'utf8'))) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!/Duplicate column|already exists/i.test(error.message)) throw error;
      }
    }
  }

  const migratePath = path.join(__dirname, '..', 'sql', 'agent_settlement_monthly.sql');
  if (fs.existsSync(migratePath)) {
    for (const statement of splitSqlStatements(fs.readFileSync(migratePath, 'utf8'))) {
      try {
        await pool.query(statement);
      } catch (error) {
        if (!/Duplicate column|already exists/i.test(error.message)) throw error;
      }
    }
  }

  const columns = [
    ['total_deposit_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER period_end'],
    ['total_withdraw_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total_deposit_amount'],
    ['balance_before', 'DECIMAL(15,2) NULL AFTER approved_at'],
    ['balance_after', 'DECIMAL(15,2) NULL AFTER balance_before'],
    ['wallet_transaction_id', 'BIGINT UNSIGNED NULL AFTER balance_after'],
    ['zero_reason', 'VARCHAR(120) NULL AFTER wallet_transaction_id'],
  ];

  for (const [name, definition] of columns) {
    const [[exists]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_commission_settlements' AND COLUMN_NAME = ?`,
      [name],
    );
    if (!Number(exists.cnt)) {
      await pool.query(`ALTER TABLE agent_commission_settlements ADD COLUMN ${name} ${definition}`);
    }
  }

  try {
    await pool.query(
      `ALTER TABLE agent_commission_settlements
       ADD UNIQUE KEY uq_agent_period (agent_id, period_start, period_end)`,
    );
  } catch {
    // may exist
  }

  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS agent_wallet_transactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        agent_id BIGINT UNSIGNED NOT NULL,
        type VARCHAR(64) NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        balance_before DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        balance_after DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        reference_type VARCHAR(64) NULL,
        reference_id BIGINT UNSIGNED NULL,
        note TEXT NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_awt_agent (agent_id),
        KEY idx_awt_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
  } catch {
    // ignore
  }

  try {
    await pool.query(`ALTER TABLE agent_commissions ADD COLUMN settlement_id BIGINT NULL AFTER status`);
  } catch {
    // column may exist
  }

  await pool.query(
    `UPDATE agent_commission_settings SET settlement_type = 'monthly' WHERE settlement_type IN ('daily', 'weekly')`,
  ).catch(() => {});

  await pool.query(
    `UPDATE agent_commissions SET status = 'pending' WHERE status = 'credited' AND settlement_id IS NULL`,
  ).catch(() => {});
}

async function linkAgentCommissions(connection, agentId, settlementId, periodStartSql, periodEndSql) {
  await connection.query(
    `UPDATE agent_commissions
     SET settlement_id = ?
     WHERE agent_id = ?
       AND settlement_id IS NULL
       AND status = 'pending'
       AND created_at >= ?
       AND created_at <= ?`,
    [settlementId, agentId, periodStartSql, periodEndSql],
  );
}

export async function generateAgentCommissionSettlements({
  window: inputWindow,
  periodStart,
  periodEnd,
  mode = 'open',
  force = false,
} = {}) {
  const pool = getPool();
  const settings = await getAgentSettlementSettings();

  let window = inputWindow;
  if (!window) {
    if (periodStart && periodEnd) {
      const startDate = String(periodStart).slice(0, 10);
      const endDate = String(periodEnd).slice(0, 10);
      window = {
        settlementType: SETTLEMENT_TYPE,
        startDate,
        endDate,
        mode,
        weekRange: `${startDate} → ${endDate}`,
        name: `Monthly ${startDate} → ${endDate}`,
        dateRange: `${startDate} – ${endDate}`,
      };
    } else {
      window = getSettlementWindowForSettings(settings, new Date(), mode);
    }
  }

  const { periodStartSql, periodEndSql } = windowToSqlRange(window);
  const connection = await pool.getConnection();
  const created = [];
  const updated = [];
  const depositPercent = Number(settings.deposit_percent);
  const withdrawPercent = Number(settings.withdraw_percent);

  try {
    await connection.beginTransaction();

    const [agents] = await connection.query(
      `SELECT id, name, balance FROM agents WHERE status = 'active'`,
    );

    for (const agent of agents) {
      const totals = await calculateAgentTransactionTotals(
        agent.id,
        periodStartSql,
        periodEndSql,
        depositPercent,
        withdrawPercent,
      );

      const zeroReason = resolveSettlementZeroReason({
        agentExists: Boolean(agent.id),
        ...totals,
      });

      console.log('[AgentCommissionSettlement]', JSON.stringify({
        agent_id: agent.id,
        agent_name: agent.name,
        period_start: periodStartSql,
        period_end: periodEndSql,
        total_deposit: totals.totalDepositAmount,
        total_withdraw: totals.totalWithdrawAmount,
        deposit_commission: totals.depositCommission,
        withdraw_commission: totals.withdrawCommission,
        total_commission: totals.totalCommission,
        matched_transaction_count: totals.matchedTransactionCount,
        deposit_percent: depositPercent,
        withdraw_percent: withdrawPercent,
        zero_reason: zeroReason,
        mode: window.mode || mode,
      }));

      const [[existing]] = await connection.query(
        `SELECT id, status FROM agent_commission_settlements
         WHERE agent_id = ? AND period_start = ? AND period_end = ?
         LIMIT 1`,
        [agent.id, periodStartSql, periodEndSql],
      );

      if (existing) {
        if (existing.status === 'approved' && !force) {
          continue;
        }
        if (existing.status === 'pending' || force) {
          await connection.query(
            `UPDATE agent_commission_settlements
             SET settlement_type = ?, total_deposit_amount = ?, total_withdraw_amount = ?,
                 deposit_commission = ?, withdraw_commission = ?, total_commission = ?,
                 zero_reason = ?, updated_at = NOW()
             WHERE id = ?`,
            [
              SETTLEMENT_TYPE,
              totals.totalDepositAmount,
              totals.totalWithdrawAmount,
              totals.depositCommission,
              totals.withdrawCommission,
              totals.totalCommission,
              zeroReason,
              existing.id,
            ],
          );
          await linkAgentCommissions(connection, agent.id, existing.id, periodStartSql, periodEndSql);
          updated.push(existing.id);
        }
        continue;
      }

      const [insertResult] = await connection.query(
        `INSERT INTO agent_commission_settlements
           (agent_id, period_start, period_end, settlement_type,
            total_deposit_amount, total_withdraw_amount,
            deposit_commission, withdraw_commission, total_commission, zero_reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          agent.id,
          periodStartSql,
          periodEndSql,
          SETTLEMENT_TYPE,
          totals.totalDepositAmount,
          totals.totalWithdrawAmount,
          totals.depositCommission,
          totals.withdrawCommission,
          totals.totalCommission,
          zeroReason,
        ],
      );

      await linkAgentCommissions(connection, agent.id, insertResult.insertId, periodStartSql, periodEndSql);
      created.push(insertResult.insertId);
    }

    await connection.query(
      `UPDATE agent_commission_settings
       SET last_settlement_run_at = NOW(), last_settlement_period_end = ?
       WHERE id = (SELECT id FROM (SELECT id FROM agent_commission_settings ORDER BY id ASC LIMIT 1) AS s)`,
      [periodEndSql],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    created: created.length,
    updated: updated.length,
    settlementIds: [...created, ...updated],
    window,
    periodStart: periodStartSql,
    periodEnd: periodEndSql,
    periodLabel: formatPeriodLabel(window),
    dateRange: window.dateRange,
    settlementType: SETTLEMENT_TYPE,
    mode: window.mode || mode,
  };
}

export async function listAdminAgentCommissionSettlements({ status = 'all', search = '' } = {}) {
  const pool = getPool();
  const params = [];
  let statusClause = '';

  if (status === 'settled') {
    statusClause = "AND s.status = 'approved'";
  } else if (['pending', 'approved', 'rejected'].includes(status)) {
    statusClause = 'AND s.status = ?';
    params.push(status === 'settled' ? 'approved' : status);
  }

  const searchTerm = String(search || '').trim();
  let searchClause = '';
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    searchClause = 'AND (a.name LIKE ? OR a.mobile LIKE ? OR CAST(s.agent_id AS CHAR) LIKE ? OR CAST(s.id AS CHAR) LIKE ?)';
    params.push(like, like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT
       s.*,
       a.name AS agent_name,
       a.mobile AS agent_mobile,
       a.balance AS agent_balance,
       admin.name AS approved_by_name,
       (SELECT COUNT(*) FROM agent_commissions ac WHERE ac.settlement_id = s.id) AS commission_count
     FROM agent_commission_settlements s
     INNER JOIN agents a ON a.id = s.agent_id
     LEFT JOIN users admin ON admin.id = s.approved_by
     WHERE 1 = 1
     ${statusClause}
     ${searchClause}
     ORDER BY s.created_at DESC
     LIMIT 500`,
    params,
  );

  return rows.map(mapSettlementRow);
}

export async function getAgentCommissionSettlementDetails(settlementId) {
  const pool = getPool();
  const [[settlement]] = await pool.query(
    `SELECT s.*, a.name AS agent_name, a.mobile AS agent_mobile, a.balance AS agent_balance
     FROM agent_commission_settlements s
     INNER JOIN agents a ON a.id = s.agent_id
     WHERE s.id = ?
     LIMIT 1`,
    [settlementId],
  );

  if (!settlement) {
    const error = new Error('Settlement not found');
    error.statusCode = 404;
    throw error;
  }

  const [commissions] = await pool.query(
    `SELECT ac.id, ac.type, ac.amount, ac.rate, ac.commission_amount, ac.status, ac.created_at,
            u.name AS player_name, u.phone AS player_phone
     FROM agent_commissions ac
     LEFT JOIN users u ON u.id = ac.player_id
     WHERE ac.settlement_id = ?
     ORDER BY ac.created_at DESC`,
    [settlementId],
  );

  return {
    settlement: mapSettlementRow({ ...settlement, commission_count: commissions.length }),
    commissions: commissions.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      rate: Number(row.rate),
      commissionAmount: Number(row.commission_amount),
      status: row.status,
      playerName: row.player_name || row.player_phone || '—',
      createdAt: row.created_at,
    })),
  };
}

async function insertAgentNotification(connection, { agentId, title, message, referenceType, referenceId }) {
  await connection.query(
    `INSERT INTO agent_notifications (agent_id, title, message, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?)`,
    [agentId, title, message, referenceType || null, referenceId || null],
  ).catch(() => {});
}

export async function approveAgentCommissionSettlement(settlementId, adminId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[settlement]] = await connection.query(
      `SELECT s.*, a.balance AS agent_balance, a.name AS agent_name
       FROM agent_commission_settlements s
       INNER JOIN agents a ON a.id = s.agent_id
       WHERE s.id = ?
       FOR UPDATE`,
      [settlementId],
    );

    if (!settlement) {
      const error = new Error('Settlement not found');
      error.statusCode = 404;
      throw error;
    }

    if (settlement.status === 'approved') {
      const error = new Error('Settlement is already approved');
      error.statusCode = 400;
      throw error;
    }

    if (settlement.status === 'rejected') {
      const error = new Error('Rejected settlement cannot be approved');
      error.statusCode = 400;
      throw error;
    }

    const totalCommission = Number(settlement.total_commission);
    const balanceBefore = Number(settlement.agent_balance || 0);
    const balanceAfter = Number((balanceBefore + totalCommission).toFixed(2));
    let walletTransactionId = null;

    await connection.query(
      `UPDATE agent_commission_settlements
       SET status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [adminId, settlementId],
    );

    if (totalCommission > 0) {
      await connection.query(
        `UPDATE agents SET balance = ? WHERE id = ?`,
        [balanceAfter, settlement.agent_id],
      );

      walletTransactionId = await logAgentWalletTransaction(connection, {
        agentId: settlement.agent_id,
        type: 'agent_commission_settlement',
        amount: totalCommission,
        balanceBefore,
        balanceAfter,
        referenceType: 'agent_commission_settlement',
        referenceId: settlementId,
        note: `Monthly commission settlement #${settlementId} approved`,
        createdBy: adminId,
      });
    }

    await connection.query(
      `UPDATE agent_commission_settlements
       SET balance_before = ?, balance_after = ?, wallet_transaction_id = ?
       WHERE id = ?`,
      [balanceBefore, balanceAfter, walletTransactionId, settlementId],
    );

    await connection.query(
      `UPDATE agent_commissions SET status = 'settled' WHERE settlement_id = ?`,
      [settlementId],
    );

    await insertAgentNotification(connection, {
      agentId: settlement.agent_id,
      title: 'Commission settlement approved',
      message: `Your monthly commission settlement of ৳${totalCommission.toFixed(2)} has been approved and added to your agent wallet.`,
      referenceType: 'settlement',
      referenceId: settlementId,
    });

    await connection.commit();

    return {
      ...mapSettlementRow({
        ...settlement,
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date(),
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        wallet_transaction_id: walletTransactionId,
        commission_count: 0,
      }),
      creditedAgentId: settlement.agent_id,
      balanceBefore,
      balanceAfter,
      amount: totalCommission,
      walletTransactionId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function rejectAgentCommissionSettlement(settlementId, adminId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[settlement]] = await connection.query(
      `SELECT * FROM agent_commission_settlements WHERE id = ? FOR UPDATE`,
      [settlementId],
    );

    if (!settlement) {
      const error = new Error('Settlement not found');
      error.statusCode = 404;
      throw error;
    }

    if (settlement.status === 'approved') {
      const error = new Error('Approved settlement cannot be rejected');
      error.statusCode = 400;
      throw error;
    }

    if (settlement.status === 'rejected') {
      const error = new Error('Settlement is already rejected');
      error.statusCode = 400;
      throw error;
    }

    await connection.query(
      `UPDATE agent_commission_settlements SET status = 'rejected', rejected_at = NOW() WHERE id = ?`,
      [settlementId],
    );

    await connection.query(
      `UPDATE agent_commissions
       SET status = 'rejected', settlement_id = NULL
       WHERE settlement_id = ?`,
      [settlementId],
    );

    await insertAgentNotification(connection, {
      agentId: settlement.agent_id,
      title: 'Commission settlement rejected',
      message: `Your monthly commission settlement of ৳${Number(settlement.total_commission).toFixed(2)} was rejected by admin.`,
      referenceType: 'settlement',
      referenceId: settlementId,
    });

    await connection.commit();

    return mapSettlementRow({
      ...settlement,
      status: 'rejected',
      rejected_at: new Date(),
      agent_name: '',
      agent_mobile: '',
      agent_balance: 0,
      commission_count: 0,
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAgentCommissionSettlements(agentId) {
  const pool = getPool();
  const settings = await getAgentSettlementSettings();
  const currentWindow = getSettlementWindowForSettings(settings);

  const [rows] = await pool.query(
    `SELECT s.*, a.name AS agent_name, a.mobile AS agent_mobile, a.balance AS agent_balance,
            (SELECT COUNT(*) FROM agent_commissions ac WHERE ac.settlement_id = s.id) AS commission_count
     FROM agent_commission_settlements s
     INNER JOIN agents a ON a.id = s.agent_id
     WHERE s.agent_id = ?
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [agentId],
  );

  const [[pendingTotals]] = await pool.query(
    `SELECT COALESCE(SUM(total_commission), 0) AS total
     FROM agent_commission_settlements
     WHERE agent_id = ? AND status = 'pending'`,
    [agentId],
  );

  const [[settledTotals]] = await pool.query(
    `SELECT COALESCE(SUM(total_commission), 0) AS total
     FROM agent_commission_settlements
     WHERE agent_id = ? AND status = 'approved'`,
    [agentId],
  );

  return {
    pendingSettlementTotal: Number(pendingTotals.total || 0),
    settledSettlementTotal: Number(settledTotals.total || 0),
    currentPeriodLabel: formatPeriodLabel(currentWindow),
    currentSettlementType: SETTLEMENT_TYPE,
    settlements: rows.map(mapSettlementRow),
  };
}

export default {
  migrateAgentCommissionSettlementSchema,
  getAgentSettlementSettings,
  generateAgentCommissionSettlements,
  listAdminAgentCommissionSettlements,
  getAgentCommissionSettlementDetails,
  approveAgentCommissionSettlement,
  rejectAgentCommissionSettlement,
  listAgentCommissionSettlements,
};
