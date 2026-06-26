#!/usr/bin/env python3
import paramiko
import time

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

OLD = """  return {
    bonusAmount,
    ruleId,
    ruleTitle,
  };
}

async function findEligibleRuleById"""

NEW = """  return {
    bonusAmount,
    ruleId: rule.id,
    ruleTitle: rule.title,
  };
}

async function findEligibleRuleById"""

REPROCESS = r"""
import { getPool } from './config/db.js';
import { processWinypayDepositCallback } from './services/winypayCallbackService.js';
import { findWinypayOrderByOrderId } from './services/winypayService.js';

const pool = getPool();
const conn = await pool.getConnection();
const order = await findWinypayOrderByOrderId(conn, 'DEP-1782231433442-31');
conn.release();
if (!order) { console.log('NO_ORDER'); process.exit(1); }
const payload = order.callback_payload ? JSON.parse(order.callback_payload) : { order_id: 'DEP-1782231433442-31', status: 'success' };
const rawBody = typeof order.callback_payload === 'string' ? order.callback_payload : JSON.stringify(payload);
const sig = order.callback_signature || '';
try {
  const result = await processWinypayDepositCallback({ rawBody, signature: sig, parsedBody: payload });
  console.log('REPROCESS_OK', JSON.stringify(result));
} catch (e) {
  console.error('REPROCESS_ERR', e.message);
  process.exit(1);
}
process.exit(0);
"""

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')
    if OLD in content:
        content = content.replace(OLD, NEW)
        with sftp.file(FILE, 'w') as f:
            f.write(content)
        print('FIXED ruleId in creditAutomaticMainWalletDepositBonus')
    else:
        print('fix already applied or pattern missing')

    c.exec_command(f'node --check {FILE}')

    with sftp.file('/www/wwwroot/jowabuzz/backend/tmp_reprocess_dep.mjs', 'w') as f:
        f.write(REPROCESS)
    sftp.close()

    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    time.sleep(4)

    _, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node tmp_reprocess_dep.mjs 2>&1')
    print(o.read().decode())
    print(e.read().decode()[:500])
    c.exec_command('rm -f /www/wwwroot/jowabuzz/backend/tmp_reprocess_dep.mjs')

    _, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, amount, status FROM transactions WHERE id=145;
SELECT balance FROM users WHERE id=31;
SELECT order_id, status FROM winypay_payment_orders WHERE order_id LIKE '%1782231433442%' OR transaction_id=145;
" """)
    print(o.read().decode())
    c.close()

if __name__ == '__main__':
    main()
