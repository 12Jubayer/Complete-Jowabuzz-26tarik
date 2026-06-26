import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'ls -la /www/wwwroot/ 2>/dev/null',
    'ls -la /www/wwwroot/jowabuzz/ 2>/dev/null',
    'test -f /www/wwwroot/jowabuzz/backend/.env && echo ENV_OK || echo ENV_MISSING',
    'ls /www/wwwroot/jowabuzz/backend/uploads 2>/dev/null | head -5',
    'pm2 jlist 2>/dev/null | head -c 2000',
    'ls -la /www/wwwroot/jowabuzz/frontend/ 2>/dev/null | head -15',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err: print('ERR:', err)
c.close()
