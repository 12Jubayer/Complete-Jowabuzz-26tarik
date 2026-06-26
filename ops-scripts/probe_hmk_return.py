import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e 'DESCRIBE game_sessions;'",
    "grep -n 'returnUrl\\|HMK_RETURN' /www/wwwroot/jowabuzz/backend/services/hmkApiService.js | head -20",
    "grep 'HMK_RETURN_URL' /www/wwwroot/jowabuzz/backend/.env",
    "grep 'PUBLIC_SITE_URL' /www/wwwroot/jowabuzz/backend/.env",
]

for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace'))
    err = e.read().decode('utf-8', 'replace')
    if err and 'Warning' not in err:
        print('ERR', err[:300])

c.close()
