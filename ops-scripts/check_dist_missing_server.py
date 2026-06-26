import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "ls /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>&1 | wc -l",
    "ls /www/wwwroot/jowabuzz/frontend/dist/index.html 2>&1",
    "grep -n 'static\\|dist\\|sendFile' /www/wwwroot/jowabuzz/backend/server.js | head -20",
]
for cmd in cmds:
    print('===', cmd)
    _,o,e=c.exec_command(cmd)
    print(o.read().decode())
    print(e.read().decode()[:200])
c.close()
