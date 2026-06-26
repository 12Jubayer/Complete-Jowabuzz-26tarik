import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT id, user_id, amount, status, method, created_at, approved_at FROM transactions 
WHERE user_id=31 AND type='deposit' ORDER BY id DESC LIMIT 5;
SELECT * FROM payment_orders WHERE user_id=31 ORDER BY id DESC LIMIT 5;
SELECT * FROM winypay_orders WHERE user_id=31 ORDER BY id DESC LIMIT 5;
"""
sftp = c.open_sftp()
with sftp.file('/tmp/wp_check.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, e = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/wp_check.sql 2>&1')
print(o.read().decode())

cmds = [
    "grep -rn 'winypay\\|WinyPay' /www/wwwroot/jowabuzz/backend/routes --include='*.js' | head -15",
    "pm2 logs jowabuzz --lines 80 --nostream 2>&1 | grep -i 'winypay\\|callback\\|DEP202606' | tail -30",
]
for cmd in cmds:
    print('===', cmd[:60])
    _,o,_=c.exec_command(cmd)
    print(o.read().decode('utf-8', errors='replace')[:2500])
c.close()
