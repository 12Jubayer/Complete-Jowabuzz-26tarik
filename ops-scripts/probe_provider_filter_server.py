import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -n 'enabled\\|p.status\\|provider' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -60",
    "grep -n 'searchSiteCatalog\\|listHotPublicGames\\|buildSiteGameFilters\\|listSiteGames' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id,code,name,enabled,status FROM providers WHERE code='100HP' LIMIT 1; SELECT COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='100HP' AND g.is_active=1;\"",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

c.close()
