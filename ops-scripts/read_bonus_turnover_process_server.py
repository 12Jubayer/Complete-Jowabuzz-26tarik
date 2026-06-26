import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command('sed -n "350,480p" /www/wwwroot/jowabuzz/backend/services/bonusTurnoverService.js')
print(o.read().decode())
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%bonus_turnover%'; SELECT * FROM bonus_turnover_rules LIMIT 5\" 2>/dev/null")
print(o.read().decode())
c.close()
