import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -rn 'getPublicGameProviders\\|public/game-providers' /www/wwwroot/jowabuzz/backend 2>/dev/null")
print(o.read().decode() or 'not routed')
c.close()
