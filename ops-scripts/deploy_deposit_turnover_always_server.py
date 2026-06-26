#!/usr/bin/env python3
"""Every deposit creates/merges turnover pool; UI shows active pool only."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
BONUS_FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'
UI_FILE = '/www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx'

OLD_RULE_BLOCK = """  const rule = await resolveDepositBonusRule(connection, userId, depositAmount, depositTxId);
  if (!rule) return null;

  const bonusAmount = Number(((depositAmount * Number(rule.bonus_percent)) / 100).toFixed(2));
  if (bonusAmount <= 0) return null;

  const bonusPercent = Number(rule.bonus_percent);
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
  );"""

NEW_RULE_BLOCK = """  const rule = await resolveDepositBonusRule(connection, userId, depositAmount, depositTxId);

  let bonusAmount = 0;
  let bonusPercent = 0;
  let ruleId = 1;
  let ruleTitle = 'Deposit Turnover';

  if (rule) {
    bonusAmount = Number(((depositAmount * Number(rule.bonus_percent)) / 100).toFixed(2));
    bonusPercent = Number(rule.bonus_percent);
    ruleId = Number(rule.id);
    ruleTitle = rule.title;
  } else {
    const [[defaultRule]] = await connection.query(
      `SELECT id, title FROM deposit_bonus_rules WHERE id = 1 LIMIT 1`,
    );
    if (defaultRule) {
      ruleId = Number(defaultRule.id);
      ruleTitle = defaultRule.title || ruleTitle;
    }
  }

  const turnoverMultiplier = 1;
  const newDepositTurnover = Number(depositAmount.toFixed(2));

  if (bonusAmount > 0) {
    const [bonusTx] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
       VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
      [userId, bonusAmount, `deposit_bonus:${ruleId}:${depositTxId}`],
    );

    await connection.query(
      `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
       VALUES (?, ?, ?, 'approved', ?)`,
      [userId, `${ruleTitle} Bonus`, bonusAmount, bonusTx.insertId],
    );
  }"""

OLD_INSERT_RULE_REF = """      userId,
      rule.id,
      depositTxId,"""

NEW_INSERT_RULE_REF = """      userId,
      ruleId,
      depositTxId,"""

OLD_RETURN = """    ruleId: rule.id,
    ruleTitle: rule.title,"""

NEW_RETURN = """    ruleId,
    ruleTitle,"""

OLD_UI = """  const turnoverStats = bonusProgress
    ? {
        completedTurnover: Number(bonusProgress.completedTurnover || 0),
        requiredTurnover: Number(bonusProgress.requiredTurnover || 0),
        progressPercent: Number(bonusProgress.progressPercent || 0),
        isComplete: !bonusTurnoverIncomplete,
      }
    : wallet
      ? {
          completedTurnover: Number(wallet.completedTurnover || 0),
          requiredTurnover: Number(wallet.requiredTurnover || 0),
          progressPercent: wallet.turnoverComplete
            ? 100
            : Number(wallet.requiredTurnover) > 0
              ? Math.min(100, (Number(wallet.completedTurnover || 0) / Number(wallet.requiredTurnover)) * 100)
              : 100,
          isComplete: Boolean(wallet.turnoverComplete),
        }
      : {
          completedTurnover: 0,
          requiredTurnover: 0,
          progressPercent: 100,
          isComplete: true,
        };"""

NEW_UI = """  const turnoverStats = bonusProgress
    ? {
        completedTurnover: Number(bonusProgress.completedTurnover || 0),
        requiredTurnover: Number(bonusProgress.requiredTurnover || 0),
        progressPercent: Number(bonusProgress.progressPercent || 0),
        isComplete: !bonusTurnoverIncomplete,
      }
    : {
        completedTurnover: 0,
        requiredTurnover: 0,
        progressPercent: 100,
        isComplete: true,
      };"""

RETRO_SQL = """
INSERT INTO user_bonus_accounts
  (user_id, rule_id, deposit_transaction_id, deposit_amount, bonus_percent, bonus_amount,
   turnover_multiplier, required_turnover, completed_turnover, remaining_turnover, progress, status)
SELECT 31, 1, 130, 200.00, 3.00, 0.00, 1, 200.00, 0.00, 200.00, 0.00, 'in_progress'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM user_bonus_accounts WHERE user_id=31 AND status='in_progress'
)
AND NOT EXISTS (
  SELECT 1 FROM user_bonus_accounts WHERE deposit_transaction_id=130
);
SELECT id, deposit_amount, required_turnover, completed_turnover, status
FROM user_bonus_accounts WHERE user_id=31 ORDER BY id DESC LIMIT 3;
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()

    with sftp.file(BONUS_FILE, 'r') as f:
        bonus = f.read().decode('utf-8')
    if OLD_RULE_BLOCK in bonus:
        bonus = bonus.replace(OLD_RULE_BLOCK, NEW_RULE_BLOCK)
        bonus = bonus.replace(OLD_INSERT_RULE_REF, NEW_INSERT_RULE_REF)
        bonus = bonus.replace(OLD_RETURN, NEW_RETURN)
        with sftp.file(BONUS_FILE, 'w') as f:
            f.write(bonus)
        print('PATCHED depositBonusService always turnover pool')
    else:
        print('bonus service already patched or pattern mismatch')

    with sftp.file(UI_FILE, 'r') as f:
        ui = f.read().decode('utf-8')
    if OLD_UI in ui:
        ui = ui.replace(OLD_UI, NEW_UI)
        with sftp.file(UI_FILE, 'w') as f:
            f.write(ui)
        print('PATCHED AccountPage turnover display')
    elif 'isComplete: true,' in ui and 'wallet.turnoverComplete' not in ui.split('turnoverStats')[1][:600]:
        print('UI already patched')
    else:
        print('WARN UI patch mismatch')

    with sftp.file('/tmp/retro_turnover_31.sql', 'w') as f:
        f.write(RETRO_SQL)
    sftp.close()

    c.exec_command(f'node --check {BONUS_FILE}')
    _, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/retro_turnover_31.sql')
    print('RETRO:', o.read().decode())

    c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build')
    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
