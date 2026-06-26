import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("sed -n '493,550p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js")
print('MAIN BONUS:', o.read().decode())
_, o, _ = c.exec_command("sed -n '688,820p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js")
print('PROCESS:', o.read().decode())
c.close()
