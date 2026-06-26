"""Fix deposit bonus crediting main wallet + correct user 31 balance."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
BONUS_SVC = f'{ROOT}/backend/services/depositBonusService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(BONUS_SVC, 'r') as f:
    bonus = f.read().decode('utf-8').replace('\r\n', '\n')

old_block = """  const remainingTurnover = requiredTurnover;

  await applyBalanceDelta(connection, userId, bonusAmount);

  const [bonusTx] = await connection.query("""

new_block = """  const remainingTurnover = requiredTurnover;

  // Bonus stays in user_bonus_accounts only; do not add to main wallet again.

  const [bonusTx] = await connection.query("""

if old_block not in bonus:
    if 'Bonus stays in user_bonus_accounts only' in bonus:
        print('ALREADY_PATCHED bonus service')
    else:
        print('PATTERN_NOT_FOUND in depositBonusService.js')
        sys.exit(1)
else:
    bonus = bonus.replace(old_block, new_block, 1)
    with sftp.open(BONUS_SVC, 'w') as f:
        f.write(bonus.encode('utf-8'))
    print('PATCHED depositBonusService.js - removed main wallet bonus credit')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/depositBonusService.js')
print('syntax:', e.read().decode()[:200] or 'ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:120])
time.sleep(2)

# Correct user 31: remove wrongly credited 100 bonus from main wallet
fix_sql = r'''
cd /www/wwwroot/jowabuzz/backend && node --input-type=module <<'NODE'
import 'dotenv/config';
import { connectDatabase, getPool } from './config/db.js';

await connectDatabase();
const pool = getPool();
const userId = 31;
const correction = 100;

const [[user]] = await pool.query('SELECT balance FROM users WHERE id=?', [userId]);
const before = Number(user.balance);
const after = Number((before - correction).toFixed(2));
console.log('before', before, 'after', after);

const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('UPDATE users SET balance=? WHERE id=?', [after, userId]);
  await conn.query('UPDATE wallets SET balance=? WHERE user_id=?', [after, userId]);
  await conn.query('UPDATE user_wallets SET balance=? WHERE user_id=?', [after, userId]);
  await conn.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'adjustment', ?, 'approved', ?, NOW())`,
    [userId, -correction, 'deposit_bonus_main_wallet_fix:txn127'],
  );
  await conn.commit();
  console.log('CORRECTED user', userId);
} catch (e) {
  await conn.rollback();
  throw e;
} finally {
  conn.release();
}

const [[check]] = await pool.query('SELECT balance FROM users WHERE id=?', [userId]);
console.log('final balance', check.balance);
await pool.end();
NODE
'''

_, o, e = c.exec_command(fix_sql, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:500])

# Audit other recent deposit+bonus double credits
audit = """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT uba.user_id, uba.deposit_transaction_id, uba.bonus_amount, u.balance
FROM user_bonus_accounts uba
JOIN users u ON u.id = uba.user_id
WHERE uba.created_at >= '2026-06-23'
ORDER BY uba.id DESC" """
_, o, _ = c.exec_command(audit)
print('recent bonus accounts:', o.read().decode())

c.close()
print('DONE')
