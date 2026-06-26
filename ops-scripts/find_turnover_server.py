import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -rl 'turnover' /www/wwwroot/jowabuzz/backend --include='*.js' | head -30",
    "grep -rl 'turnover' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' | head -20",
]
for cmd in cmds:
    print('===', cmd[:60], '===')
    _,o,e=c.exec_command(cmd)
    print(o.read().decode())
c.close()
