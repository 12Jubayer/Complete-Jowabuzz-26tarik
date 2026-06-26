"""Check provider SVG content and API for strip."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command('head -5 /www/wwwroot/jowabuzz/frontend/public/images/providers/jdb.svg')
print('jdb.svg:', o.read().decode())

_, o, _ = c.exec_command('head -5 /www/wwwroot/jowabuzz/frontend/public/images/providers/pg.svg')
print('pg.svg:', o.read().decode())

_, o, _ = c.exec_command(
    "grep -n 'listPublicGameProviders\\|listSiteProviders' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -10"
)
print('api fn:', o.read().decode())

_, o, _ = c.exec_command(
    "sed -n '1005,1080p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print(o.read().decode('utf-8', 'replace')[:3000])

c.close()
