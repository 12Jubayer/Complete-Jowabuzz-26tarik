"""Reprocess stuck winypay success deposits on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

script = r'''
cd /www/wwwroot/jowabuzz/backend && node --input-type=module <<'NODE'
import 'dotenv/config';
import { connectDatabase, getPool } from './config/db.js';
import { approveDepositTransaction, finalizeDepositSideEffects } from './services/adminDepositService.js';
import { finalizeDepositBonusNotification, processDepositBonusTurnover } from './services/bonusTurnoverService.js';
import { finalizeDepositBalanceBonusNotification, processDepositBalanceBonus } from './services/depositBonusService.js';
import { processAffiliateCommissionsForTransaction } from './services/commissionSettingsService.js';
import { resolveDepositChannelFromTransaction, setWithdrawChannelOnFirstDeposit } from './services/withdrawChannelService.js';

await connectDatabase();
const pool = getPool();

const [rows] = await pool.query(`
  SELECT wpo.transaction_id, wpo.order_id
  FROM winypay_payment_orders wpo
  INNER JOIN transactions t ON t.id = wpo.transaction_id
  WHERE wpo.order_type = 'deposit'
    AND wpo.status = 'success'
    AND t.type = 'deposit'
    AND t.status = 'pending'
`);

console.log('stuck deposits:', rows.length);

for (const row of rows) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const transaction = await approveDepositTransaction(connection, row.transaction_id);
    await setWithdrawChannelOnFirstDeposit(connection, {
      userId: transaction.user_id,
      depositType: resolveDepositChannelFromTransaction(transaction),
      depositId: transaction.id,
    });
    const bonusResult = await processDepositBonusTurnover(connection, transaction);
    const depositBonusResult = await processDepositBalanceBonus(connection, transaction);
    await processAffiliateCommissionsForTransaction(connection, transaction.id);
    await connection.commit();
    await finalizeDepositSideEffects(transaction);
    if (bonusResult) await finalizeDepositBonusNotification(transaction.user_id, bonusResult);
    if (depositBonusResult) {
      await finalizeDepositBalanceBonusNotification(transaction.user_id, depositBonusResult);
    }
    const [[user]] = await pool.query('SELECT balance FROM users WHERE id = ?', [transaction.user_id]);
    console.log('CREDITED', {
      order_id: row.order_id,
      transaction_id: row.transaction_id,
      user_id: transaction.user_id,
      amount: transaction.amount,
      balance: user?.balance,
    });
  } catch (error) {
    await connection.rollback();
    console.error('FAILED', row.order_id, error.message);
  } finally {
    connection.release();
  }
}

await pool.end();
NODE
'''

_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR:', err[:1000])

_, o, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"SELECT t.id,t.user_id,t.amount,t.status,u.balance FROM transactions t "
    "JOIN users u ON u.id=t.user_id WHERE t.id=123; "
    "SELECT status FROM deposit_requests WHERE transaction_id=123;\""
)
print('verify:', o.read().decode())
c.close()
