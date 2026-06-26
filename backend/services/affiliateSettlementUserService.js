import { getPool } from '../config/db.js';
import { creditAffiliateUserBalance, getAffiliateUserId } from './affiliateUserBalanceService.js';
import { isValidNumericPlayerCode } from './providerUsernameService.js';
import { logWalletTransaction } from './walletTransactionService.js';

export const SETTLEMENT_USER_INVALID_MSG =
  'Invalid settlement User ID. Please enter an active player User ID.';

const SETTLEMENT_LOOKUP_COLUMN = 'provider_username';

async function columnExists(pool, table, column) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return Number(row?.cnt || 0) > 0;
}

function logSettlementValidationDebug(details) {
  console.warn('[settlement-user-validation]', details);
}

export async function validateActivePlayerUserId(rawUserId, options = {}) {
  const { excludeUserId = null, connection = null } = options;
  const publicPlayerId = String(rawUserId ?? '').trim();

  if (!publicPlayerId || !isValidNumericPlayerCode(publicPlayerId)) {
    logSettlementValidationDebug({
      received: rawUserId,
      normalized: publicPlayerId,
      searchedColumn: SETTLEMENT_LOOKUP_COLUMN,
      found: false,
      reason: 'invalid_format',
    });
    return { valid: false, error: SETTLEMENT_USER_INVALID_MSG };
  }

  const db = connection || getPool();
  let user = null;
  let matchedBy = SETTLEMENT_LOOKUP_COLUMN;

  const [[byProvider]] = await db.query(
    `SELECT id, name, status, role, provider_username, phone
     FROM users
     WHERE provider_username = ?
     LIMIT 1`,
    [publicPlayerId],
  );
  user = byProvider || null;

  if (!user) {
    const phoneDigits = publicPlayerId.replace(/\D/g, '');
    if (phoneDigits.length >= 9 && phoneDigits.length <= 13) {
      const [[byPhone]] = await db.query(
        `SELECT id, name, status, role, provider_username, phone
         FROM users
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
            OR phone = ?
         LIMIT 1`,
        [phoneDigits, phoneDigits],
      );
      if (byPhone) {
        user = byPhone;
        matchedBy = 'phone';
      }
    }
  }

  if (!user) {
    logSettlementValidationDebug({
      received: rawUserId,
      normalized: publicPlayerId,
      searchedColumn: SETTLEMENT_LOOKUP_COLUMN,
      found: false,
      reason: 'not_found',
    });
    return { valid: false, error: SETTLEMENT_USER_INVALID_MSG };
  }

  if (user.status !== 'active' || user.role !== 'user') {
    logSettlementValidationDebug({
      received: rawUserId,
      normalized: publicPlayerId,
      searchedColumn: matchedBy,
      found: true,
      userId: user.id,
      status: user.status,
      role: user.role,
      reason: 'inactive_or_not_player',
    });
    return { valid: false, error: SETTLEMENT_USER_INVALID_MSG };
  }

  if (excludeUserId && Number(excludeUserId) === Number(user.id)) {
    logSettlementValidationDebug({
      received: rawUserId,
      normalized: publicPlayerId,
      searchedColumn: SETTLEMENT_LOOKUP_COLUMN,
      found: true,
      userId: user.id,
      status: user.status,
      reason: 'self_reference',
    });
    return { valid: false, error: SETTLEMENT_USER_INVALID_MSG };
  }

  const providerUsername = String(user.provider_username || '').trim() || publicPlayerId;

  return {
    valid: true,
    userId: Number(user.id),
    userName: user.name,
    providerUsername,
    matchedBy,
  };
}

export async function getAffiliateSettlementUserId(affiliateId, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT settlement_user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );
  const value = row?.settlement_user_id;
  return value ? Number(value) : null;
}

export async function resolveSettlementCreditUserId(affiliateId, connection = null) {
  const settlementUserId = await getAffiliateSettlementUserId(affiliateId, connection);
  if (settlementUserId) return settlementUserId;
  return getAffiliateUserId(affiliateId, connection);
}

export async function logSettlementUserChange({
  affiliateId,
  oldUserId,
  newUserId,
  changedByAffiliateId = null,
  changedByAdminId = null,
  connection = null,
}) {
  const db = connection || getPool();
  await db.query(
    `INSERT INTO affiliate_settlement_user_history
      (affiliate_id, old_settlement_user_id, new_settlement_user_id, changed_by_affiliate_id, changed_by_admin_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      affiliateId,
      oldUserId || null,
      newUserId,
      changedByAffiliateId || null,
      changedByAdminId || null,
    ],
  );
}

export async function setAffiliateSettlementUserId({
  affiliateId,
  settlementUserId,
  excludeUserId = null,
  changedByAffiliateId = null,
  changedByAdminId = null,
  connection = null,
}) {
  const db = connection || getPool();
  const validation = await validateActivePlayerUserId(settlementUserId, {
    excludeUserId,
    connection: db,
  });

  if (!validation.valid) {
    const error = new Error(validation.error);
    error.statusCode = 400;
    throw error;
  }

  const [[current]] = await db.query(
    `SELECT settlement_user_id FROM affiliate_profiles WHERE id = ? LIMIT 1`,
    [affiliateId],
  );

  const oldUserId = current?.settlement_user_id ? Number(current.settlement_user_id) : null;
  const newUserId = validation.userId;

  if (oldUserId === newUserId) {
    return {
      settlementUserId: validation.providerUsername,
      settlementUserName: validation.userName,
      changed: false,
    };
  }

  await db.query(
    `UPDATE affiliate_profiles SET settlement_user_id = ? WHERE id = ?`,
    [newUserId, affiliateId],
  );

  await logSettlementUserChange({
    affiliateId,
    oldUserId,
    newUserId,
    changedByAffiliateId,
    changedByAdminId,
    connection: db,
  });

  return {
    settlementUserId: validation.providerUsername,
    settlementUserName: validation.userName,
    changed: true,
  };
}

export async function creditAffiliateSettlementPayout({
  affiliateId,
  settlementId,
  amount,
  adminId = null,
  weekStart = null,
  weekEnd = null,
  connection,
}) {
  const payoutAmount = Number(amount);
  if (!payoutAmount || payoutAmount <= 0) {
    return {
      creditedUserId: null,
      balanceBefore: null,
      balanceAfter: null,
      walletTransactionId: null,
    };
  }

  const creditUserId = await resolveSettlementCreditUserId(affiliateId, connection);
  if (!creditUserId) {
    const error = new Error('No settlement player wallet configured for this affiliate');
    error.statusCode = 400;
    throw error;
  }

  const credit = await creditAffiliateUserBalance(creditUserId, payoutAmount, connection);
  const walletTransactionId = await logWalletTransaction(
    {
      userId: creditUserId,
      type: 'affiliate_commission_settlement',
      amount: payoutAmount,
      balanceBefore: credit.balanceBefore,
      balanceAfter: credit.balanceAfter,
      referenceType: 'affiliate_settlement',
      referenceId: settlementId,
      note: `Affiliate settlement #${settlementId} approved (player User ID ${creditUserId})`,
      createdBy: adminId,
    },
    connection,
  );

  if (settlementId) {
    await connection.query(
      `UPDATE affiliate_settlements
       SET credited_user_id = ?,
           settlement_user_id = ?,
           balance_before = ?,
           balance_after = ?,
           wallet_transaction_id = ?
       WHERE id = ?`,
      [
        creditUserId,
        creditUserId,
        credit.balanceBefore,
        credit.balanceAfter,
        walletTransactionId,
        settlementId,
      ],
    );
  }

  if (weekStart && weekEnd) {
    await connection.query(
      `UPDATE settlement_history
       SET settlement_user_id = ?,
           approved_by = ?,
           approved_at = NOW()
       WHERE affiliate_id = ?
         AND week_start = ?
         AND week_end = ?
         AND status IN ('pending', 'released')`,
      [creditUserId, adminId, affiliateId, weekStart, weekEnd],
    );
  }

  return {
    creditedUserId: creditUserId,
    settlementUserId: creditUserId,
    balanceBefore: credit.balanceBefore,
    balanceAfter: credit.balanceAfter,
    walletTransactionId,
  };
}

export async function migrateAffiliateSettlementUserSchema() {
  const pool = getPool();

  if (!(await columnExists(pool, 'affiliate_profiles', 'settlement_user_id'))) {
    await pool.query(
      `ALTER TABLE affiliate_profiles
       ADD COLUMN settlement_user_id BIGINT NULL AFTER user_id,
       ADD INDEX idx_affiliate_profiles_settlement_user_id (settlement_user_id)`,
    );
  }

  if (!(await columnExists(pool, 'affiliate_settlements', 'settlement_user_id'))) {
    await pool.query(
      `ALTER TABLE affiliate_settlements
       ADD COLUMN settlement_user_id BIGINT UNSIGNED NULL AFTER credited_user_id`,
    );
  }

  for (const [column, definition] of [
    ['settlement_user_id', 'BIGINT NULL AFTER amount'],
    ['approved_by', 'BIGINT NULL AFTER status'],
    ['approved_at', 'TIMESTAMP NULL AFTER approved_by'],
  ]) {
    if (!(await columnExists(pool, 'settlement_history', column))) {
      await pool.query(`ALTER TABLE settlement_history ADD COLUMN ${column} ${definition}`);
    }
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS affiliate_settlement_user_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      affiliate_id BIGINT NOT NULL,
      old_settlement_user_id BIGINT NULL,
      new_settlement_user_id BIGINT NOT NULL,
      changed_by_affiliate_id BIGINT NULL,
      changed_by_admin_id BIGINT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_aff_settlement_user_history_affiliate (affiliate_id),
      CONSTRAINT fk_aff_settlement_user_history_affiliate
        FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

export default migrateAffiliateSettlementUserSchema;
