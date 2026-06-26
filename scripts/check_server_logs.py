import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "pm2 logs jowabuzz --lines 120 --nostream 2>&1 | tail -120",
    "grep HMK_CURRENCY /www/wwwroot/jowabuzz/backend/.env",
    """mysql -N -e "SELECT code,name,provider_logo FROM jowabuzz.providers WHERE enabled=1 LIMIT 15" 2>/dev/null || echo 'no mysql'""",
]

for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', errors='replace')[:2500])
    err = e.read().decode('utf-8', errors='replace')
    if err.strip():
        print('ERR:', err[:500])

c.close()
