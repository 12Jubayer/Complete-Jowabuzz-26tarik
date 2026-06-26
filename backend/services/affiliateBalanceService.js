import { getPool } from '../config/db.js';
import { creditAffiliateSettlementPayout } from './affiliateSettlementUserService.js';

export const AFFILIATE_PENDING_THRESHOLD = 2000;

async function columnExists(pool, table, column) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(row?.cnt || 0) > 0;
}

export async function findApprovedReferrerForUser(userId, connection) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT parent.id AS affiliate_id, parent.commission_percent
     FROM affiliate_profiles child
     INNER JOIN affiliate_profiles parent ON child.referred_by = parent.id
     WHERE child.user_id = ? AND parent.status = 'approved'
     LIMIT 1`,
    [userId],
  );
  return row || null;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

/**
 * @param {number} userId - referred player user id
 * @param {number} profitLoss - positive when player won, negative when player lost
 */
export async function applyReferralGameProfitLoss(userId, profitLoss, connection = null) {
  const amount = roundMoney(profitLoss);
  if (!userId || !amount) return null;

  const pool = getPool();
  const conn = connection || (await pool.getConnection());
  const ownConnection = !connection;

  try {
    if (ownConnection) await conn.beginTransaction();

    const referrer = await findApprovedReferrerForUser(userId, conn);
    if (!referrer) {
      if (ownConnection) await conn.commit();
      return null;
    }

    const commissionPercent = Number(referrer.commission_percent || 0);
    if (commissionPercent <= 0) {
      if (ownConnection) await conn.commit();
      return null;
    }

    // Player loss (profitLoss < 0) increases affiliate available; player win decreases it.
    const houseSide = roundMoney(-amount);
    const commissionDelta = roundMoney((houseSide * commissionPercent) / 100);
    if (commissionDelta === 0) {
      if (ownConnection) await conn.commit();
      return null;
    }

    await conn.query(
      `UPDATE affiliate_profiles
       SET available_balance = available_balance + ?
       WHERE id = ?`,
      [commissionDelta, referrer.affiliate_id],
    );

    await syncAvailableToPendingSettlement(referrer.affiliate_id, conn);

    if (ownConnection) await conn.commit();
    return { affiliateId: referrer.affiliate_id, commissionDelta };
  } catch (error) {
    if (ownConnection) await conn.rollback();
    throw error;
  } finally {
    if (ownConnection) conn.release();
  }
}

export async function trackOracleBetForAffiliate(userId, betAmount, transactionId, connection) {
  if (!userId || !betAmount || betAmount <= 0) return;
  await connection.query(
    `INSERT INTO affiliate_pending_bets (user_id, bet_amount, bet_transaction_id)
     VALUES (?, ?, ?)`,
    [userId, roundMoney(betAmount), String(transactionId || '')],
  );
}

export async function settleOracleBetForAffiliate(userId, settleAmount, connection) {
  const settle = roundMoney(settleAmount);
  const [[bet]] = await connection.query(
    `SELECT id, bet_amount
     FROM affiliate_pending_bets
     WHERE user_id = ? AND settled = 0
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [userId],
  );

  if (!bet) {
    if (settle > 0) {
      await applyReferralGameProfitLoss(userId, settle, connection);
    }
    return;
  }

  const betAmount = roundMoney(bet.bet_amount);
  const profitLoss = roundMoney(settle - betAmount);

  await connection.query(`UPDATE affiliate_pending_bets SET settled = 1 WHERE id = ?`, [bet.id]);
  await applyReferralGameProfitLoss(userId, profitLoss, connection);
}

export async function cancelOracleBetForAffiliate(userId, connection) {
  await connection.query(
    `UPDATE affiliate_pending_bets SET settled = 1 WHERE user_id = ? AND settled = 0`,
    [userId],
  );
}

async function hasOpenAvailableBalanceSettlement(affiliateId, connection) {
  const [rows] = await connection.query(
    `SELECT id
     FROM affiliate_settlements
     WHERE affiliate_id = ? AND status = 'pending' AND settlement_source = 'available_balance'
     LIMIT 1`,
    [affiliateId],
  );
  return rows[0] || null;
}

async function createAvailableBalanceSettlementPeriod(connection) {
  const today = new Date().toISOString().slice(0, 10);
  const [result] = await connection.query(
    `INSERT INTO affiliate_settlement_periods
      (name, settlement_type, start_date, end_date, commission_percent, is_active)
     VALUES (?, 'threshold', ?, ?, 0, 0)`,
    [`Available Balance ${Date.now()}`, today, today],
  );
  return result.insertId;
}

export async function syncAvailableToPendingSettlement(affiliateId, connection) {
  const [[profile]] = await connection.query(
    `SELECT available_balance, pending_settlement_balance, commission_percent
     FROM affiliate_profiles
     WHERE id = ?
     FOR UPDATE`,
    [affiliateId],
  );

  if (!profile) return;

  const available = roundMoney(profile.available_balance);
  const open = await hasOpenAvailableBalanceSettlement(affiliateId, connection);

  if (open) {
    const [[settlement]] = await connection.query(
      `SELECT total_commission FROM affiliate_settlements WHERE id = ? LIMIT 1`,
      [open.id],
    );
    await connection.query(
      `UPDATE affiliate_profiles SET pending_settlement_balance = ? WHERE id = ?`,
      [roundMoney(settlement?.total_commission || 0), affiliateId],
    );
    return;
  }

  if (available < AFFILIATE_PENDING_THRESHOLD) {
    await connection.query(
      `UPDATE affiliate_profiles SET pending_settlement_balance = 0 WHERE id = ?`,
      [affiliateId],
    );
    return;
  }

  const eligibleAmount = available;

  await connection.query(
    `UPDATE affiliate_profiles
     SET available_balance = available_balance - ?,
         pending_settlement_balance = pending_settlement_balance + ?
     WHERE id = ?`,
    [eligibleAmount, eligibleAmount, affiliateId],
  );

  const periodId = await createAvailableBalanceSettlementPeriod(connection);
  const [insertResult] = await connection.query(
    `INSERT INTO affiliate_settlements
      (affiliate_id, period_id, total_referrals, total_commission, total_profit,
       settlement_source, status)
     VALUES (?, ?, 0, ?, ?, 'available_balance', 'pending')`,
    [affiliateId, periodId, eligibleAmount, eligibleAmount],
  );

  const today = new Date().toISOString().slice(0, 10);
  await connection.query(
    `INSERT INTO settlement_history
      (affiliate_id, week_start, week_end, total_profit, commission_percent, amount, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      affiliateId,
      today,
      today,
      eligibleAmount,
      Number(profile.commission_percent || 0),
      eligibleAmount,
    ],
  );

  return insertResult.insertId;
}

export async function getAffiliateBalanceSnapshot(affiliateId, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT
       available_balance,
       pending_settlement_balance,
       total_settlement_balance
     FROM affiliate_profiles
     WHERE id = ?
     LIMIT 1`,
    [affiliateId],
  );

  if (!row) {
    return { availableBalance: 0, pendingBalance: 0, totalBalance: 0 };
  }

  return {
    availableBalance: roundMoney(row.available_balance),
    pendingBalance: roundMoney(row.pending_settlement_balance),
    totalBalance: roundMoney(row.total_settlement_balance),
  };
}

export async function completeAvailableBalanceSettlement(settlement, adminId, connection) {
  const amount = roundMoney(settlement.total_commission);
  const affiliateId = settlement.affiliate_id;

  await connection.query(
    `UPDATE affiliate_settlements
     SET status = 'settled', approved_by = ?, approved_at = NOW()
     WHERE id = ?`,
    [adminId, settlement.id],
  );

  await connection.query(
    `UPDATE settlement_history
     SET status = 'released'
     WHERE affiliate_id = ?
       AND week_start = ?
       AND week_end = ?
       AND status = 'pending'
       AND amount = ?`,
    [
      affiliateId,
      String(settlement.start_date).slice(0, 10),
      String(settlement.end_date).slice(0, 10),
      amount,
    ],
  );

  if (amount > 0) {
    await connection.query(
      `UPDATE affiliate_profiles
       SET pending_settlement_balance = GREATEST(pending_settlement_balance - ?, 0),
           total_settlement_balance = total_settlement_balance + ?
       WHERE id = ?`,
      [amount, amount, affiliateId],
    );

    await creditAffiliateSettlementPayout({
      affiliateId,
      settlementId: settlement.id,
      amount,
      adminId,
      weekStart: String(settlement.start_date).slice(0, 10),
      weekEnd: String(settlement.end_date).slice(0, 10),
      connection,
    });
  }

  return { success: true, amount };
}

export async function rejectAvailableBalanceSettlement(settlement, connection) {
  const amount = roundMoney(settlement.total_commission);
  const affiliateId = settlement.affiliate_id;

  await connection.query(
    `UPDATE affiliate_settlements SET status = 'rejected' WHERE id = ?`,
    [settlement.id],
  );

  await connection.query(
    `UPDATE settlement_history
     SET status = 'rejected'
     WHERE affiliate_id = ?
       AND week_start = ?
       AND week_end = ?
       AND status = 'pending'
       AND amount = ?`,
    [
      affiliateId,
      String(settlement.start_date).slice(0, 10),
      String(settlement.end_date).slice(0, 10),
      amount,
    ],
  );

  if (amount > 0) {
    await connection.query(
      `UPDATE affiliate_profiles
       SET pending_settlement_balance = GREATEST(pending_settlement_balance - ?, 0),
           available_balance = available_balance + ?
       WHERE id = ?`,
      [amount, amount, affiliateId],
    );
  }

  return { success: true };
}

export async function migrateAffiliateBalanceSchema() {
  const pool = getPool();

  const profileColumns = [
    ['available_balance', 'DECIMAL(15, 2) NOT NULL DEFAULT 0'],
    ['pending_settlement_balance', 'DECIMAL(15, 2) NOT NULL DEFAULT 0'],
    ['total_settlement_balance', 'DECIMAL(15, 2) NOT NULL DEFAULT 0'],
  ];

  for (const [column, definition] of profileColumns) {
    if (!(await columnExists(pool, 'affiliate_profiles', column))) {
      await pool.query(`ALTER TABLE affiliate_profiles ADD COLUMN ${column} ${definition}`);
    }
  }

  if (!(await columnExists(pool, 'affiliate_settlements', 'settlement_source'))) {
    await pool.query(
      `ALTER TABLE affiliate_settlements
       ADD COLUMN settlement_source VARCHAR(32) NOT NULL DEFAULT 'period' AFTER total_profit`,
    );
  }

  if (!(await columnExists(pool, 'affiliate_settlement_periods', 'settlement_type'))) {
    await pool.query(
      `ALTER TABLE affiliate_settlement_periods
       ADD COLUMN settlement_type VARCHAR(10) NOT NULL DEFAULT 'weekly' AFTER name`,
    );
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS affiliate_pending_bets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      bet_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      bet_transaction_id VARCHAR(120) NOT NULL DEFAULT '',
      settled TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_affiliate_pending_bets_user (user_id, settled),
      CONSTRAINT fk_affiliate_pending_bets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

export default migrateAffiliateBalanceSchema;
