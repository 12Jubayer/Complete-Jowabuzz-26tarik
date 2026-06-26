import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "pm2 logs jowabuzz --lines 80 --nostream 2>&1 | grep -i 'Game Start\\|SPRIBE\\|Aviator\\|launch' | tail -40",
    "grep -rn 'launchOracleGame\\|openGameUrl\\|game/start' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' | head -40",
    "grep -n 'openGameUrl\\|launchLocks\\|window.open' /www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js",
    "grep -rn 'Aviator\\|SPRIBE' /www/wwwroot/jowabuzz/frontend/src/components --include='*.jsx' | head -30",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:3500] or '(empty)')
    err = e.read().decode('utf-8', 'replace')
    if err and 'Warning' not in err:
        print('ERR', err[:300])
    print()

c.close()
