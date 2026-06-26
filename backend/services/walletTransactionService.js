import { getPool } from '../config/db.js';

export async function logWalletTransaction(payload, connection = null) {
  const pool = connection || getPool();
  const {
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    referenceType = null,
    referenceId = null,
    note = null,
    createdBy = null,
  } = payload;

  const [result] = await pool.query(
    `INSERT INTO wallet_transactions
      (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      Number(amount),
      Number(balanceBefore),
      Number(balanceAfter),
      referenceType,
      referenceId,
      note,
      createdBy,
    ],
  );

  return result.insertId;
}

export async function migrateWalletTransactionSchema() {
  const pool = getPool();
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, '..', 'sql', 'migrate.sql');

  if (fs.existsSync(schemaPath)) {
    const statements = fs
      .readFileSync(schemaPath, 'utf8')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
  }

  const columns = [
    ['total_eligible_deposit', "DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total_referrals"],
    ['commission_percent', "DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER total_eligible_deposit"],
    ['credited_user_id', 'BIGINT UNSIGNED NULL AFTER approved_at'],
    ['balance_before', 'DECIMAL(15,2) NULL AFTER credited_user_id'],
    ['balance_after', 'DECIMAL(15,2) NULL AFTER balance_before'],
    ['zero_reason', 'VARCHAR(120) NULL AFTER balance_after'],
    ['wallet_transaction_id', 'BIGINT UNSIGNED NULL AFTER zero_reason'],
  ];

  for (const [name, definition] of columns) {
    const [[exists]] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'affiliate_settlements'
         AND COLUMN_NAME = ?`,
      [name],
    );

    if (!Number(exists.cnt)) {
      await pool.query(`ALTER TABLE affiliate_settlements ADD COLUMN ${name} ${definition}`);
    }
  }
}
