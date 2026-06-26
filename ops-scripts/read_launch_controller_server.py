import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -n 'launchGame\\|game_uid\\|Invalid game' /www/wwwroot/jowabuzz/backend/controllers/gameController.js | head -30",
    "grep -n 'mapSiteGameRow\\|function mapSite' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -10",
]
for cmd in cmds:
    _, o, _ = c.exec_command(cmd, timeout=30)
    print('>', cmd)
    print(o.read().decode('utf-8','replace')[:2000])

_, o, _ = c.exec_command("sed -n '55,180p' /www/wwwroot/jowabuzz/backend/controllers/gameController.js", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
