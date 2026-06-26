import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'mariadb -e "SHOW DATABASES;"',
    'grep -r DB_PASSWORD /root/ 2>/dev/null | head -5',
    'cat /www/backup/jowabuzz-migration-20260614-213512/config/backend.env 2>/dev/null || echo NO_BACKUP_ENV',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:500])
c.close()
