import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'listSiteGames\\|site/games\\|siteGame' /www/wwwroot/jowabuzz/backend --include='*.js' | head -25",
    "tail -80 /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js",
    "ls /www/wwwroot/jowabuzz/backend/routes/site* 2>/dev/null; ls /www/wwwroot/jowabuzz/backend/routes/*site* 2>/dev/null",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:5000] or '(empty)')
    print()

c.close()
