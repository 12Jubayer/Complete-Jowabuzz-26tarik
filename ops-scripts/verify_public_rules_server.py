import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "curl -s http://127.0.0.1:3001/api/public/deposit-withdraw-rules",
    "grep -l 'bonusTurnoverIncomplete' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js | head -5",
]
for cmd in cmds:
    _, o, _ = c.exec_command(cmd)
    print(o.read().decode('utf-8', errors='replace')[:800])
    print('---')
c.close()
