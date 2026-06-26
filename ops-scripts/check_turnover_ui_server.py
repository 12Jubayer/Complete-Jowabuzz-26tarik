import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep -n 'turnoverMultiplier\\|requiredTurnover\\|Deposit:' /www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileTurnoverPage.jsx /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx 2>/dev/null | head -30")
print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
