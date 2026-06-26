import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep -rn 'processDepositBalanceBonus\\|processDepositBonusTurnover\\|approveDepositTransaction' /www/wwwroot/jowabuzz/backend --include='*.js' 2>/dev/null | grep -v node_modules")
print(o.read().decode())
c.close()
