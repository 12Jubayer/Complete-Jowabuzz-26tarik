import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'cat /root/migration-restore.log 2>/dev/null | tail -80',
    'cat /root/.pm2/dump.pm2 2>/dev/null | head -100',
    'ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null',
    'grep -r jowabuzz /etc/nginx/ 2>/dev/null | head -30',
    'mysql -e "SHOW DATABASES;" 2>/dev/null',
    'find / -maxdepth 5 -name server.js -path "*/backend/*" 2>/dev/null',
    'find / -maxdepth 5 -name ".env" 2>/dev/null | head -20',
    'du -sh /var/www/html/* 2>/dev/null; ls -la /var/www/html/',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:800])
c.close()
