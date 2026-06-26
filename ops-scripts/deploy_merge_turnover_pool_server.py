#!/usr/bin/env python3
"""Merge turnover pools: remaining + new deposit = one total turnover (e.g. 50+500=550)."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

OLD_INSERT = """  const bonusPercent = Number(rule.bonus_percent);
  const turnoverMultiplier = 1;
  const requiredTurnover = Number(depositAmount.toFixed(2));
  const remainingTurnover = Number(Math.max(0, requiredTurnover).toFixed(2));

  // Bonus stays in user_bonus_accounts only; do not add to main wallet again.

  const [bonusTx] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, `deposit_bonus:${rule.id}:${depositTxId}`],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, `${rule.title} Bonus`, bonusAmount, bonusTx.insertId],
  );

  const [accountResult] = await connection.query(
    `INSERT INTO user_bonus_accounts
       (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
        turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 'in_progress')`,
    [
      userId,
      rule.id,
      depositTxId,
      depositAmount,
      bonusPercent,
      bonusAmount,
      turnoverMultiplier,
      requiredTurnover,
      remainingTurnover,
    ],
  );

  return {
    accountId: accountResult.insertId,
    ruleId: rule.id,
    ruleTitle: rule.title,
    bonusAmount,
    bonusPercent,
    turnoverMultiplier,
    requiredTurnover,
  };
}"""

NEW_INSERT = """  const bonusPercent = Number(rule.bonus_percent);
  const turnoverMultiplier = 1;
  const newDepositTurnover = Number(depositAmount.toFixed(2));

  // Bonus stays in user_bonus_accounts only; do not add to main wallet again.

  const [bonusTx] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, `deposit_bonus:${rule.id}:${depositTxId}`],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, `${rule.title} Bonus`, bonusAmount, bonusTx.insertId],
  );

  const [activeAccounts] = await connection.query(
    `SELECT id, required_turnover, completed_turnover, remaining_turnover, deposit_amount, bonus_amount
     FROM user_bonus_accounts
     WHERE user_id = ? AND status = 'in_progress'
     ORDER BY created_at ASC
     FOR UPDATE`,
    [userId],
  );

  let mergedRequired = newDepositTurnover;
  let mergedCompleted = 0;
  let mergedDeposit = depositAmount;
  let mergedBonus = bonusAmount;
  let mergedRemaining = newDepositTurnover;

  if (activeAccounts.length > 0) {
    const poolCompleted = activeAccounts.reduce((sum, row) => sum + Number(row.completed_turnover || 0), 0);
    const poolRemaining = activeAccounts.reduce((sum, row) => sum + Number(row.remaining_turnover || 0), 0);
    mergedDeposit = activeAccounts.reduce((sum, row) => sum + Number(row.deposit_amount || 0), 0) + depositAmount;
    mergedBonus = activeAccounts.reduce((sum, row) => sum + Number(row.bonus_amount || 0), 0) + bonusAmount;
    mergedCompleted = Number(poolCompleted.toFixed(2));
    mergedRequired = Number((poolRemaining + newDepositTurnover).toFixed(2));
    mergedRemaining = Number(Math.max(0, mergedRequired - mergedCompleted).toFixed(2));

    for (const account of activeAccounts) {
      await connection.query(
        `UPDATE user_bonus_accounts SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [account.id],
      );
    }
  }

  const mergedProgress = computeProgress(mergedCompleted, mergedRequired);

  const [accountResult] = await connection.query(
    `INSERT INTO user_bonus_accounts
       (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
        turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')`,
    [
      userId,
      rule.id,
      depositTxId,
      Number(mergedDeposit.toFixed(2)),
      bonusPercent,
      Number(mergedBonus.toFixed(2)),
      turnoverMultiplier,
      mergedRequired,
      mergedCompleted,
      mergedRemaining,
      mergedProgress,
    ],
  );

  return {
    accountId: accountResult.insertId,
    ruleId: rule.id,
    ruleTitle: rule.title,
    bonusAmount,
    bonusPercent,
    turnoverMultiplier,
    requiredTurnover: mergedRequired,
    merged: activeAccounts.length > 0,
  };
}"""

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
      const poolRemaining = accounts.reduce((s, a) => s + Number(a.remaining_turnover || 0), 0);
      const mergedRequired = Number((poolCompleted + poolRemaining).toFixed(2));
      const mergedDeposit = accounts.reduce((s, a) => s + Number(a.deposit_amount || 0), 0);
      const mergedBonus = accounts.reduce((s, a) => s + Number(a.bonus_amount || 0), 0);
      const mergedRemaining = Number(Math.max(0, mergedRequired - poolCompleted).toFixed(2));
      const progress = computeProgress(poolCompleted, mergedRequired);
      const latest = accounts[accounts.length - 1];
      for (const acc of accounts) {
        await conn.query(`UPDATE user_bonus_accounts SET status='cancelled', updated_at=NOW() WHERE id=?`, [acc.id]);
      }
      await conn.query(
        `INSERT INTO user_bonus_accounts
         (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
          turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'in_progress')`,
        [userId, latest.rule_id, latest.deposit_transaction_id, mergedDeposit, latest.bonus_percent,
         mergedBonus, mergedRequired, poolCompleted, mergedRemaining, progress],
      );
      await conn.commit();
      console.log('merged user', userId, 'required', mergedRequired, 'completed', poolCompleted);
    }
    console.log('retro done', users.length, 'users');
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

    if 'poolRemaining + newDepositTurnover' in content:
        print('merge logic already present')
    elif OLD_INSERT in content:
        content = content.replace(OLD_INSERT, NEW_INSERT)
        with sftp.file(FILE, 'w') as f:
            f.write(content)
        print('PATCHED processDepositBalanceBonus merge')
    else:
        print('WARN: insert block not found - manual check needed')

    _, o, e = c.exec_command(f'node --check {FILE}')
    if e.read().decode().strip():
        raise SystemExit('syntax error')

    merge_path = '/www/wwwroot/jowabuzz/backend/tmp_merge_turnover.cjs'
    with sftp.file(merge_path, 'w') as f:
        f.write(MERGE_JS)
    sftp.close()

    _, o, e = c.exec_command(f'cd /www/wwwroot/jowabuzz/backend && node {merge_path}')
    print(o.read().decode())
    err = e.read().decode()
    if err:
        print('merge err', err[:400])
    c.exec_command(f'rm -f {merge_path}')

    _, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT a.id, u.name, a.deposit_amount, a.required_turnover, a.completed_turnover, a.progress, a.status
FROM user_bonus_accounts a JOIN users u ON u.id=a.user_id
WHERE a.status='in_progress' ORDER BY a.user_id;
" """)
    print('AFTER:', o.read().decode())

    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
