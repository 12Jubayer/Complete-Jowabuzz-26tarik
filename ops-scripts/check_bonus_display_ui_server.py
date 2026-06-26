import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -n 'depositBonusBalance\\|bonusBalance\\|Deposit bonus' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx | head -15")
print(o.read().decode())
c.close()
