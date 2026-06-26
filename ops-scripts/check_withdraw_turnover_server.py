import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT id, name, balance FROM users WHERE name LIKE '%Jubayerr%' OR name LIKE '%Al Jubayerr%' LIMIT 5;
SELECT a.id, a.user_id, a.required_turnover, a.completed_turnover, a.progress, a.status
FROM user_bonus_accounts a
JOIN users u ON u.id=a.user_id
WHERE u.name LIKE '%Jubayerr%' AND a.status='in_progress';
SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id IN (SELECT id FROM users WHERE name LIKE '%Jubayerr%');
SELECT setting_key, setting_value FROM general_settings WHERE setting_key LIKE '%turnover%' OR setting_key LIKE '%withdraw%';
"""
sftp = c.open_sftp()
with sftp.file('/tmp/wd_check.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/wd_check.sql')
print(o.read().decode())

for cmd in [
    "grep -n 'bonusTurnoverComplete\\|enforceBonusTurnover\\|enforceTurnover' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js | head -20",
    "grep -n 'bonusTurnover\\|turnoverIncomplete' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx | head -20",
    "grep -rn 'enforceBonusTurnover\\|enforceTurnover' /www/wwwroot/jowabuzz/backend --include='*.js' | head -20",
]:
    print('===', cmd[:70])
    _,o,_=c.exec_command(cmd)
    print(o.read().decode())
c.close()
