import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("sed -n '680,775p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js")
print(o.read().decode())
_, o, _ = c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SHOW COLUMNS FROM user_bonus_accounts LIKE 'status'\"")
print('status col:', o.read().decode())
c.close()
