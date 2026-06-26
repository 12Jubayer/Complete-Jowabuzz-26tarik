"""Read HIDDEN config in gameCatalogService on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command(
    "grep -n 'HIDDEN\\|hidden' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -40"
)
print(o.read().decode())

_, o, _ = c.exec_command(
    "sed -n '1,120p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('--- top ---')
print(o.read().decode('utf-8', 'replace')[:5000])

c.close()
