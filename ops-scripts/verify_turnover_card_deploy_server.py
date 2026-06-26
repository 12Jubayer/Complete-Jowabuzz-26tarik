import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -n 'turnoverStats\\|Total turnover\\|loggedIn ?' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx | head -10")
print(o.read().decode())
_, o, _ = c.exec_command("grep -l 'Total turnover' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>/dev/null | head -1")
print('dist:', o.read().decode())
c.close()
