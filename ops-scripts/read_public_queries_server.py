import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "sed -n '851,920p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js",
    "sed -n '1138,1220p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js",
    "grep -n 'lookup\\|fetchGame' /www/wwwroot/jowabuzz/backend/controllers/gameController.js | head -20",
    "grep -rn 'FROM games\\|JOIN providers' /www/wwwroot/jowabuzz/backend/controllers/gameController.js /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -40",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:5000])
    print()

c.close()
