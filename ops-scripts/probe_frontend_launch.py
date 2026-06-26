import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

# Check deployed frontend launch code
cmds = [
    "grep -rn 'launchOracleGame\\|openGameUrl\\|window.open\\|iframe' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>/dev/null | head -20",
    "grep -rn 'launchOracleGame\\|openGameUrl\\|window.open' /www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js 2>/dev/null",
    "grep -rn 'launchOracleGame\\|playGame' /www/wwwroot/jowabuzz/frontend/src -r 2>/dev/null | head -30",
    "grep -rn 'game/start' /www/wwwroot/jowabuzz/frontend/src -r 2>/dev/null | head -20",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode('utf-8', 'replace')
    print(out[:2500] if out else '(empty)')
    err = e.read().decode('utf-8', 'replace')
    if err:
        print('ERR', err[:300])

c.close()
