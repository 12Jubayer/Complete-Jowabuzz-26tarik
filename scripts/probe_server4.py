import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'cat /root/migration-restore-fast.sh',
    'cat /root/migration-nginx-ssl-deploy.sh | head -120',
    'ls -la /root/*.sql /root/*.gz /root/backup* /www/backup* 2>/dev/null',
    'find /root /www /var -maxdepth 4 -name "*.sql" -o -name "*jowabuzz*" 2>/dev/null | head -30',
    'cat /etc/nginx/nginx.conf | head -60',
    'ls -laR /www/ 2>/dev/null',
    'systemctl status mysql --no-pager | head -15',
    'cat /root/.my.cnf 2>/dev/null; cat /etc/mysql/debian.cnf 2>/dev/null | head -5',
]
for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode('utf-8', errors='replace')[:8000])
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:500])
c.close()
