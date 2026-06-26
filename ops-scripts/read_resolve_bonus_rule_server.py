import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -n 'resolveDepositBonusRule\\|findBestMatchingRule\\|AUTO_MAIN' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -25")
print(o.read().decode())
_, o, _ = c.exec_command("sed -n '690,780p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js")
print(o.read().decode())
c.close()
