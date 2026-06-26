import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep -n 'creditAutomaticMainWalletDepositBonus\\|AUTO_MAIN_WALLET\\|id <>' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -20")
print(o.read().decode())
c.close()
