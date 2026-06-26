"""Inspect listHotPublicGames on server and test API."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command(
    "grep -n 'listHotPublicGames\\|PUBLIC_PROVIDER_ACTIVE\\|is_hot' "
    "/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -40"
)
print(o.read().decode('utf-8', 'replace'))

_, o, e = c.exec_command(
    "sed -n '/export async function listHotPublicGames/,/^export async function/p' "
    "/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -60"
)
print('--- function ---')
print(o.read().decode('utf-8', 'replace'))

_, o, e = c.exec_command(
    'curl -s "http://127.0.0.1:3001/api/site/hot-games?limit=3"'
)
print('--- api ---')
print(o.read().decode('utf-8', 'replace')[:500])

_, o, e = c.exec_command(
    "pm2 logs jowabuzz --lines 20 --nostream 2>&1 | tail -15"
)
print('--- logs ---')
print(o.read().decode('utf-8', 'replace'))

c.close()
