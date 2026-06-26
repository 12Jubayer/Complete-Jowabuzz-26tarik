import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'find / -maxdepth 5 -type d -name "*backup*" 2>/dev/null | head -20',
    'find / -maxdepth 5 -name "jowabuzz.sql*" 2>/dev/null',
    'ls -la /etc/letsencrypt/live/ 2>/dev/null',
    'mysql -e "SHOW DATABASES;"',
    'ls -la /etc/nginx/sites-available/ 2>/dev/null',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd, timeout=120)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:500])
c.close()
