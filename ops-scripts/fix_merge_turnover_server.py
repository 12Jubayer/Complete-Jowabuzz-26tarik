#!/usr/bin/env python3
"""Fix merge cancel to free deposit_transaction_id + retro-merge multi-account users."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

OLD_CANCEL = """      await connection.query(
        `UPDATE user_bonus_accounts SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [account.id],
      );"""

NEW_CANCEL = """      await connection.query(
        `UPDATE user_bonus_accounts SET status = 'cancelled', deposit_transaction_id = NULL, updated_at = NOW() WHERE id = ?`,
        [account.id],
      );"""

MERGE_JS = r"""
const mysql = require('mysql2/promise');
function computeProgress(completed, required) {
  const req = Number(required);
  const comp = Number(completed);
  if (req <= 0) return 100;
  return Number(Math.min(100, (comp / req) * 100).toFixed(2));
}
(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '656940d50e847e3f', database: 'jowabuzz',
  });
  try {
    const [users] = await conn.query(
      `SELECT user_id, COUNT(*) AS cnt FROM user_bonus_accounts
       WHERE status = 'in_progress' GROUP BY user_id HAVING cnt > 1`,
    );
    for (const row of users) {
      const userId = row.user_id;
      await conn.beginTransaction();
      const [accounts] = await conn.query(
        `SELECT * FROM user_bonus_accounts WHERE user_id = ? AND status = 'in_progress' ORDER BY created_at ASC FOR UPDATE`,
        [userId],
      );
      const poolCompleted = accounts.reduce((s, a) => s + Number(a.completed_turnover || 0), 0);
      const mergedRequired = accounts.reduce((s, a) => s + Number(a.required_turnover || 0), 0);
      const mergedDeposit = accounts.reduce((s, a) => s + Number(a.deposit_amount || 0), 0);
      const mergedBonus = accounts.reduce((s, a) => s + Number(a.bonus_amount || 0), 0);
      const mergedRemaining = Number(Math.max(0, mergedRequired - poolCompleted).toFixed(2));
      const progress = computeProgress(poolCompleted, mergedRequired);
      const latest = accounts[accounts.length - 1];
      const keepTxId = latest.deposit_transaction_id;
      for (const acc of accounts) {
        await conn.query(
          `UPDATE user_bonus_accounts SET status='cancelled', deposit_transaction_id=NULL, updated_at=NOW() WHERE id=?`,
          [acc.id],
        );
      }
      await conn.query(
        `INSERT INTO user_bonus_accounts
         (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
          turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'in_progress')`,
        [userId, latest.rule_id, keepTxId, mergedDeposit, latest.bonus_percent,
         mergedBonus, mergedRequired, poolCompleted, mergedRemaining, progress],
      );
      await conn.commit();
      console.log('merged user', userId, mergedRequired, poolCompleted);
    }
    console.log('done', users.length);
  } catch (e) {
    await conn.rollback();
    console.error('ERR', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
"""

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')
    if OLD_CANCEL in content:
        content = content.replace(OLD_CANCEL, NEW_CANCEL)
        with sftp.file(FILE, 'w') as f:
            f.write(content)
        print('PATCHED cancel null deposit_tx')
    else:
        print('cancel patch already applied or not found')

    merge_path = '/www/wwwroot/jowabuzz/backend/tmp_merge_turnover.cjs'
    with sftp.file(merge_path, 'w') as f:
        f.write(MERGE_JS)
    sftp.close()

    c.exec_command(f'node --check {FILE}')
    _, o, e = c.exec_command(f'cd /www/wwwroot/jowabuzz/backend && node {merge_path}')
    print(o.read().decode())
    if e.read().decode().strip():
        print('ERR', e.read().decode()[:300])
    c.exec_command(f'rm -f {merge_path}')

    _, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT a.id,u.name,a.deposit_amount,a.required_turnover,a.completed_turnover,a.progress,a.status
FROM user_bonus_accounts a JOIN users u ON u.id=a.user_id WHERE a.status='in_progress' ORDER BY a.user_id;" """)
    print(o.read().decode())
    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
