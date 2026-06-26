import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT id, title, bonus_percent, turnover_multiplier, min_deposit, max_deposit, claim_limit, is_active
FROM deposit_bonus_rules ORDER BY id;
SELECT a.id, a.user_id, a.rule_id, a.deposit_amount, a.bonus_amount, a.turnover_multiplier,
       a.required_turnover, a.completed_turnover, a.remaining_turnover, a.progress, a.status, a.created_at
FROM user_bonus_accounts a WHERE a.user_id=31 ORDER BY a.created_at;
SELECT user_id, required_turnover, completed_turnover FROM user_wallets WHERE user_id=31;
"""
sftp = c.open_sftp()
with sftp.file('/tmp/tov.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/tov.sql')
print(o.read().decode())

_, o, _ = c.exec_command("grep -n 'resolvePrimaryDepositBonusProgress\\|requiredTurnover\\|turnover_multiplier\\|playableTotal' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -40")
print('CODE:', o.read().decode())
c.close()
