import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'aviator\\|SPRIBE\\|spribe\\|launchGame\\|launchHmk\\|sessionToken\\|game_sessions' /www/wwwroot/jowabuzz/backend/services/*.js 2>/dev/null | head -80",
    "grep -rn 'launch' /www/wwwroot/jowabuzz/backend/routes/*.js 2>/dev/null | head -40",
]

for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000])
    err = e.read().decode('utf-8', 'replace')
    if err:
        print('ERR', err[:500])

c.close()
