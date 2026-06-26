"""Find Lucky Sports game data and launch flow on server."""
import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"SELECT g.id, g.code, g.name, g.provider_id, p.code AS provider_code, g.category, g.is_active "
    "FROM games g JOIN providers p ON p.id=g.provider_id "
    "WHERE p.code='LUCKYSPORTS' LIMIT 5\"",
    "grep -rn 'startGame\\|launchGame\\|openGame\\|game/start' /www/wwwroot/jowabuzz/frontend/src --include='*.js' --include='*.jsx' 2>/dev/null | head -40",
    "grep -rn 'handleGameClick\\|onGameClick\\|playGame' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' 2>/dev/null | head -30",
    "cat /www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js | head -120",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:5000])
    print()

c.close()
