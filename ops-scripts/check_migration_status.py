import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "ps aux | grep migrate_oracle | grep -v grep",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT COUNT(*) games FROM games; SELECT COUNT(*) providers FROM providers; SELECT COUNT(*) oracle FROM providers WHERE adapter_key='oracle';\"",
    "ls -lt /www/wwwroot/jowabuzz/backend/backups/pre-hmk-migration* 2>/dev/null | head -3",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=30000)
    print('>', cmd)
    print(o.read().decode('utf-8','replace'))
    err = e.read().decode('utf-8','replace')
    if err.strip(): print('err', err[:200])
c.close()
