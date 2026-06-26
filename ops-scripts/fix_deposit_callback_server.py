"""Fix deposit callback wallet credit bug + credit stuck deposit."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
ADMIN_DEP = f'{ROOT}/backend/services/adminDepositService.js'
ADMIN_CTRL = f'{ROOT}/backend/controllers/adminDepositController.js'
WINYPAY_CB = f'{ROOT}/backend/services/winypayCallbackService.js'
REPROCESS = f'{ROOT}/backend/scripts/reprocess_winypay_success_deposits.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# 1. Remove guard from approveDepositTransaction (blocks gateway callback)
with sftp.open(ADMIN_DEP, 'r') as f:
    dep = f.read().decode('utf-8').replace('\r\n', '\n')

dep = dep.replace(
    "import { assertNotWinypayPendingForManualApproval } from './winypayCallbackService.js';\n",
    '',
)
dep = dep.replace(
    "  await assertNotWinypayPendingForManualApproval(connection, transactionId, 'deposit');\n\n",
    '',
)

with sftp.open(ADMIN_DEP, 'w') as f:
    f.write(dep.encode('utf-8'))
print('PATCHED adminDepositService.js')

# 2. Add guard only to manual admin approve
with sftp.open(ADMIN_CTRL, 'r') as f:
    ctrl = f.read().decode('utf-8').replace('\r\n', '\n')

if 'assertNotWinypayPendingForManualApproval' not in ctrl:
    ctrl = ctrl.replace(
        "import {\n  approveDepositTransaction,",
        "import { assertNotWinypayPendingForManualApproval } from '../services/winypayCallbackService.js';\nimport {\n  approveDepositTransaction,",
    )
    ctrl = ctrl.replace(
        "    const transaction = await approveDepositTransaction(connection, transactionId);",
        "    await assertNotWinypayPendingForManualApproval(connection, transactionId, 'deposit');\n    const transaction = await approveDepositTransaction(connection, transactionId);",
        1,
    )
    with sftp.open(ADMIN_CTRL, 'w') as f:
        f.write(ctrl.encode('utf-8'))
    print('PATCHED adminDepositController.js')

# 3. Remove misleading 409 swallow in callback - after fix it shouldn't happen, but improve logging
with sftp.open(WINYPAY_CB, 'r') as f:
    cb = f.read().decode('utf-8').replace('\r\n', '\n')

old_catch = """      try {
        transaction = await approveDepositTransaction(connection, order.transaction_id);
      } catch (error) {
        if (error.statusCode === 409) {
          await updateWinypayOrder(connection, orderId, {
            status: 'success',
            processed_at: new Date(),
          });
          await connection.commit();
          return CALLBACK_OK;
        }
        throw error;
      }"""

new_catch = """      transaction = await approveDepositTransaction(connection, order.transaction_id);"""

if old_catch in cb:
    cb = cb.replace(old_catch, new_catch, 1)
    with sftp.open(WINYPAY_CB, 'w') as f:
        f.write(cb.encode('utf-8'))
    print('PATCHED winypayCallbackService.js deposit catch')

# 4. Reprocess script for stuck success orders
REPROCESS_JS = r"""import 'dotenv/config';
import { getPool } from '../config/db.js';
import {
  approveDepositTransaction,
  finalizeDepositSideEffects,
} from '../services/adminDepositService.js';
import {
  finalizeDepositBonusNotification,
  processDepositBonusTurnover,
} from '../services/bonusTurnoverService.js';
import {
  finalizeDepositBalanceBonusNotification,
  processDepositBalanceBonus,
} from '../services/depositBonusService.js';
import { processAffiliateCommissionsForTransaction } from '../services/commissionSettingsService.js';
import {
  resolveDepositChannelFromTransaction,
  setWithdrawChannelOnFirstDeposit,
} from '../services/withdrawChannelService.js';

const pool = getPool();

const [rows] = await pool.query(`
  SELECT wpo.transaction_id, wpo.order_id, t.status AS txn_status, t.user_id, t.amount
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
"""

with sftp.open(REPROCESS, 'w') as f:
    f.write(REPROCESS_JS.encode('utf-8'))
print('WROTE reprocess script')

sftp.close()

_, o, e = c.exec_command(
    f'cd {ROOT}/backend && node --check services/adminDepositService.js && '
    f'node --check controllers/adminDepositController.js && '
    f'node --check services/winypayCallbackService.js'
)
err = e.read().decode()
print('syntax:', err[:500] or 'ok')
if err.strip():
    sys.exit(1)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:150])
time.sleep(3)

_, o, e = c.exec_command(f'cd {ROOT}/backend && node scripts/reprocess_winypay_success_deposits.js 2>&1', timeout=120000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:500])

_, o, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"SELECT t.id,t.user_id,t.amount,t.status,u.balance FROM transactions t "
    "JOIN users u ON u.id=t.user_id WHERE t.id=123; "
    "SELECT status FROM deposit_requests WHERE transaction_id=123;\""
)
print('verify:', o.read().decode())

c.close()
print('DONE')
