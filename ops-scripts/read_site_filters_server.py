"""Read site game filter functions on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command(
    "grep -n 'buildSiteGameFilters\\|listSiteGames\\|mapSiteGameRow\\|searchSiteCatalog' "
    "/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print(o.read().decode())

_, o, _ = c.exec_command(
    "sed -n '880,980p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('--- buildSiteGameFilters ---')
print(o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command(
    "sed -n '1180,1260p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('--- searchSiteCatalog ---')
print(o.read().decode('utf-8', 'replace'))

c.close()
