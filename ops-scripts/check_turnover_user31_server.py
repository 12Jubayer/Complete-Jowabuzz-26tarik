import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT u.id, u.name, u.balance FROM users u WHERE u.name='Din1122' OR u.id=31;
SELECT * FROM user_bonus_accounts WHERE user_id=31;
SELECT user_id, required_turnover, completed_turnover FROM user_wallets WHERE user_id=31;
SELECT COUNT(*) as bet_count, SUM(ABS(amount)) as total FROM transactions WHERE user_id=31 AND type='bet' LIMIT 5;
SELECT id, type, amount, method, created_at FROM transactions WHERE user_id=31 ORDER BY id DESC LIMIT 15;
"""

sftp = c.open_sftp()
with sftp.file('/tmp/check_turnover.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, e = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/check_turnover.sql')
print(o.read().decode())
print(e.read().decode())

cmds = [
    "grep -n 'applyDepositBonusTurnover\\|applyBonusClaimTurnover\\|completed_turnover' /www/wwwroot/jowabuzz/backend/services/hmkApiService.js | head -20",
    "grep -n 'applyDepositBonusTurnover' /www/wwwroot/jowabuzz/backend/services/gamingGatewayService.js 2>/dev/null | head -10",
]
for cmd in cmds:
    print('===', cmd[:70])
    _,o,_=c.exec_command(cmd)
    print(o.read().decode())
c.close()
