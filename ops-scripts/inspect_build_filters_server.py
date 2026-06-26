"""Inspect and fix buildSiteGameFilters patch on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command(
    "sed -n '29,60p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('constants:', o.read().decode())

_, o, _ = c.exec_command(
    "sed -n '895,960p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('buildSiteGameFilters:', o.read().decode())

c.close()
