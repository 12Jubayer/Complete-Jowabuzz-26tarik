#!/usr/bin/env python3
"""Fix deposit bonus turnover multiplier: use selected rule's multiplier on (deposit + 3%)."""
import re
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE_FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

OLD = """  const turnoverMultiplier = 1;
  const newDepositTurnover = Number((depositAmount + autoMainBonus).toFixed(2));"""

NEW = """  const turnoverMultiplier = rule ? Number(rule.turnover_multiplier) : 1;
  const turnoverBase = Number((depositAmount + autoMainBonus).toFixed(2));
  const newDepositTurnover = Number((turnoverBase * turnoverMultiplier).toFixed(2));"""

FIX_ACCOUNTS_SQL = """
UPDATE user_bonus_accounts a
INNER JOIN deposit_bonus_rules r ON r.id = a.rule_id
INNER JOIN deposit_requests dr ON dr.transaction_id = a.deposit_transaction_id
SET
  a.turnover_multiplier = r.turnover_multiplier,
  a.required_turnover = ROUND((a.deposit_amount + (
    SELECT COALESCE(SUM(t.amount), 0)
    FROM transactions t
    WHERE t.user_id = a.user_id
      AND t.type = 'bonus'
      AND t.status = 'approved'
      AND t.method = CONCAT('deposit_main_bonus:1:', a.deposit_transaction_id)
  )) * r.turnover_multiplier, 2),
  a.remaining_turnover = GREATEST(0, ROUND((a.deposit_amount + (
    SELECT COALESCE(SUM(t.amount), 0)
    FROM transactions t
    WHERE t.user_id = a.user_id
      AND t.type = 'bonus'
      AND t.status = 'approved'
      AND t.method = CONCAT('deposit_main_bonus:1:', a.deposit_transaction_id)
  )) * r.turnover_multiplier, 2) - a.completed_turnover),
  a.progress = CASE
    WHEN a.deposit_amount <= 0 THEN 0
    ELSE LEAST(100, ROUND((a.completed_turnover / NULLIF(ROUND((a.deposit_amount + (
      SELECT COALESCE(SUM(t.amount), 0)
      FROM transactions t
      WHERE t.user_id = a.user_id
        AND t.type = 'bonus'
        AND t.status = 'approved'
        AND t.method = CONCAT('deposit_main_bonus:1:', a.deposit_transaction_id)
    )) * r.turnover_multiplier, 2), 0)) * 100, 2))
  END
WHERE a.status = 'in_progress'
  AND dr.bonus_rule_id IS NOT NULL
  AND dr.bonus_rule_id > 1
  AND r.turnover_multiplier > 1
  AND a.required_turnover < ROUND((a.deposit_amount + (
    SELECT COALESCE(SUM(t.amount), 0)
    FROM transactions t
    WHERE t.user_id = a.user_id
      AND t.type = 'bonus'
      AND t.status = 'approved'
      AND t.method = CONCAT('deposit_main_bonus:1:', a.deposit_transaction_id)
  )) * r.turnover_multiplier, 2);
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = c.open_sftp()
    with sftp.open(REMOTE_FILE, 'r') as f:
        content = f.read().decode('utf-8', errors='replace')

    if OLD not in content:
        if NEW.split('\n')[0] in content:
            print('Turnover fix already applied in service file')
        else:
            raise SystemExit('Expected code block not found; aborting')
    else:
        content = content.replace(OLD, NEW, 1)
        with sftp.open(REMOTE_FILE, 'w') as f:
            f.write(content)
        print('Patched depositBonusService.js turnover calculation')
    sftp.close()

    # Recalculate in-progress accounts that used selected bonus rules with wrong 1x turnover
    recalc_sql = """
UPDATE user_bonus_accounts a
JOIN deposit_bonus_rules r ON r.id = a.rule_id
JOIN deposit_requests dr ON dr.transaction_id = a.deposit_transaction_id AND dr.bonus_rule_id = r.id
LEFT JOIN transactions ab ON ab.user_id = a.user_id
  AND ab.type = 'bonus'
  AND ab.status = 'approved'
  AND ab.method = CONCAT('deposit_main_bonus:1:', a.deposit_transaction_id)
SET
  a.turnover_multiplier = r.turnover_multiplier,
  a.required_turnover = ROUND((a.deposit_amount + COALESCE(ab.amount, 0)) * r.turnover_multiplier, 2),
  a.remaining_turnover = GREATEST(0, ROUND((a.deposit_amount + COALESCE(ab.amount, 0)) * r.turnover_multiplier, 2) - a.completed_turnover),
  a.progress = LEAST(100, ROUND((a.completed_turnover / NULLIF(ROUND((a.deposit_amount + COALESCE(ab.amount, 0)) * r.turnover_multiplier, 2), 0)) * 100, 2))
WHERE a.status = 'in_progress'
  AND dr.bonus_rule_id > 1
  AND r.turnover_multiplier > 1;
"""

    for cmd in [
        f"mysql -uroot -p656940d50e847e3f jowabuzz -e \"{recalc_sql.replace(chr(10), ' ')}\"",
        """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT a.id, u.name, a.deposit_amount, a.bonus_amount, a.turnover_multiplier,
       a.required_turnover, a.remaining_turnover, r.title, dr.bonus_rule_id
FROM user_bonus_accounts a
JOIN users u ON u.id=a.user_id
JOIN deposit_bonus_rules r ON r.id=a.rule_id
LEFT JOIN deposit_requests dr ON dr.transaction_id=a.deposit_transaction_id
WHERE a.status='in_progress' ORDER BY a.id DESC LIMIT 5" """,
        'pm2 restart jowabuzz --update-env',
        'sleep 2',
        'curl -s http://127.0.0.1:3001/api/health',
    ]:
        print('$', cmd[:70])
        _, o, e = c.exec_command(cmd, timeout=60)
        out = o.read().decode('utf-8', errors='replace')
        err = e.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out.rstrip())
        if err.strip():
            print(err.rstrip())

    c.close()
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
