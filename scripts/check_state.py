import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'ls -la /www/wwwroot/jowabuzz/backend/server.js 2>/dev/null',
    'test -f /www/wwwroot/jowabuzz/backend/.env && echo ENV_OK',
    'mysql -uroot -p656940d50e847e3f -e "SHOW DATABASES;"',
    'mysql -uroot -p656940d50e847e3f -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'jowabuzz\';" 2>/dev/null || echo 0',
    'pm2 list 2>/dev/null',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:300])
c.close()
