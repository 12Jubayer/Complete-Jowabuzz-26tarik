import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("sed -n '245,290p' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx")
print(o.read().decode())
c.close()
