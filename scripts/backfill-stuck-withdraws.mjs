import { getPool } from '../backend/config/db.js';
import { approveWithdrawTransaction, finalizeWithdrawSideEffects } from '../backend/services/adminWithdrawService.js';
import { syncWalletBalance } from '../backend/services/userWalletService.js';

const pool = getPool();
const [rows] = await pool.query(
  `SELECT o.transaction_id AS id, o.user_id, t.amount
   FROM winypay_payment_orders o
   INNER JOIN transactions t ON t.id = o.transaction_id
   WHERE o.order_type = 'withdraw' AND o.status = 'success' AND t.status = 'pending'
   ORDER BY o.id ASC`,
);

let fixed = 0;
for (const row of rows) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const tx = await approveWithdrawTransaction(connection, row.id, { fromGatewayCallback: true });
    await connection.commit();
    await finalizeWithdrawSideEffects(tx);
    fixed += 1;
    console.log('settled', row.id, row.amount);
  } catch (error) {
    await connection.rollback();
    if (String(error.message || '').includes('Insufficient')) {
      const conn2 = await pool.getConnection();
      try {
        await conn2.beginTransaction();
        await conn2.query('UPDATE users SET balance = balance - ? WHERE id = ?', [row.amount, row.user_id]);
        await conn2.query("UPDATE transactions SET status = 'approved', approved_at = NOW() WHERE id = ? AND status = 'pending'", [row.id]);
        await conn2.query("UPDATE withdraw_requests SET status = 'approved' WHERE transaction_id = ?", [row.id]);
        await conn2.commit();
        await syncWalletBalance(row.user_id);
        fixed += 1;
        console.log('force-settled', row.id, row.amount);
      } catch (e2) {
        await conn2.rollback();
        console.error('force-failed', row.id, e2.message);
      } finally {
        conn2.release();
      }
    } else {
      console.error('failed', row.id, error.message);
    }
  } finally {
    connection.release();
  }
}
console.log('done', fixed, '/', rows.length);
process.exit(0);
