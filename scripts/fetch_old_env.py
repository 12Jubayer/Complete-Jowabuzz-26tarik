import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def try_fetch(host, user, password, cmd):
    try:
        c = paramiko.SSHClient()
        c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(host, 22, user, password, timeout=20)
        _, o, e = c.exec_command(cmd, timeout=60)
        out = o.read().decode('utf-8', errors='replace')
        err = e.read().decode('utf-8', errors='replace')
        c.close()
        return out, err
    except Exception as ex:
        return '', str(ex)

# Old production server
old = try_fetch('85.120.253.100', 'root', '2uRXV3zsX7HsKut1XP',
    'cat /www/wwwroot/jowabuzz/backend/.env 2>/dev/null; echo ---; ls -la /www/wwwroot/jowabuzz/backend/ 2>/dev/null | head -5')
print('OLD SERVER:')
print(old[0][:3000] if old[0] else old[1])

# New server debian maint
new_cmds = [
    'cat /etc/mysql/debian.cnf',
    'cat /root/migration-test.sh',
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
for cmd in new_cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd)
    print(o.read().decode('utf-8', errors='replace'))
c.close()
