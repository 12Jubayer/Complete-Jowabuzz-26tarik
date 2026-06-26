import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT COUNT(*) c FROM bonus_turnover_rules; DESCRIBE bonus_turnover_rules\"")
print(o.read().decode())
c.close()
