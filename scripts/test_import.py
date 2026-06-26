import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

# Test import step by step
steps = [
    ('test old ssh', 'sshpass -p "2uRXV3zsX7HsKut1XP" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@85.120.253.100 "echo OK"'),
    ('test dump head', 'sshpass -p "2uRXV3zsX7HsKut1XP" ssh -o StrictHostKeyChecking=no root@85.120.253.100 "mysqldump -uroot -p656940d50e847e3f --single-transaction --skip-lock-tables jowabuzz 2>/dev/null | head -5"'),
    ('create db', 'mysql -uroot -p656940d50e847e3f -e "CREATE DATABASE IF NOT EXISTS jowabuzz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"'),
    ('import db', 'sshpass -p "2uRXV3zsX7HsKut1XP" ssh -o StrictHostKeyChecking=no root@85.120.253.100 "mysqldump -uroot -p656940d50e847e3f --single-transaction --skip-lock-tables --routines --triggers jowabuzz 2>/dev/null" | mysql -uroot -p656940d50e847e3f jowabuzz && echo IMPORT_OK'),
    ('count tables', 'mysql -uroot -p656940d50e847e3f -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'jowabuzz\';"'),
]
for name, cmd in steps:
    print(f'\n=== {name} ===')
    _, o, e = c.exec_command(cmd, timeout=600)
    out = o.read().decode('utf-8', errors='replace')
    err = e.read().decode('utf-8', errors='replace')
    code = o.channel.recv_exit_status()
    print(out[:2000])
    if err.strip(): print('ERR:', err[:1000])
    print('exit:', code)
    if code != 0:
        break
c.close()
