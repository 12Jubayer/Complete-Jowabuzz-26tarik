import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("sed -n '430,850p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js")
print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
