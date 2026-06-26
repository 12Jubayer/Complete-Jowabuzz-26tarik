import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'mysql -uroot -p656940d50e847e3f -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'jowabuzz\';"',
    'mysql -uroot -p656940d50e847e3f jowabuzz -e "SELECT COUNT(*) AS users FROM users;" 2>&1',
    'ls /www/wwwroot/jowabuzz/frontend/dist/index.html 2>&1',
    'ls /www/wwwroot/jowabuzz/backend/node_modules/express 2>&1 | head -1',
    'pm2 list',
    'curl -s -o /dev/null -w "node:%{http_code} " http://127.0.0.1:3001/',
    'curl -s -o /dev/null -w "nginx:%{http_code}" -H "Host: jowabuzz.com" http://127.0.0.1/',
    'ls /etc/nginx/sites-enabled/',
    'du -sh /www/wwwroot/jowabuzz/backend/uploads 2>/dev/null',
]
for cmd in cmds:
    print('===', cmd[:70], '===')
    _, o, e = c.exec_command(cmd, timeout=30)
    print((o.read() + e.read()).decode('utf-8', errors='replace'))
c.close()
