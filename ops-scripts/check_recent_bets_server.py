import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT id, type, amount, method, created_at FROM transactions WHERE user_id=31 AND created_at >= '2026-06-20' ORDER BY id;
SELECT COUNT(*) as hmk_bets FROM transactions WHERE user_id=31 AND method LIKE 'hmk:%';
SELECT COUNT(*) as soft_bets FROM transactions WHERE user_id=31 AND method LIKE 'softapi:%';
SELECT id, rule_id, title, turnover_multiplier FROM deposit_bonus_rules;
"""

sftp = c.open_sftp()
with sftp.file('/tmp/check_bets.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/check_bets.sql')
print(o.read().decode())

_, o, _ = c.exec_command("grep -n 'HMK\\|ORACLE\\|gamingGateway\\|hmkApi' /www/wwwroot/jowabuzz/backend/.env 2>/dev/null | head -20")
print('ENV:', o.read().decode())

_, o, _ = c.exec_command("grep -rn 'applyDepositBonusTurnover\\|completed_turnover' /www/wwwroot/jowabuzz/backend/services/gamingGatewayService.js | head -20")
print('gateway:', o.read().decode())

c.close()
