"""Scan server for remaining provider enabled loopholes."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

patterns = [
    'enabled IS NULL',
    'COALESCE(p.enabled',
    'provider_enabled === null',
    'LEFT JOIN providers',
]

for p in patterns:
    _, o, _ = c.exec_command(
        f"grep -n '{p}' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js "
        f"/www/wwwroot/jowabuzz/backend/controllers/gameController.js 2>/dev/null"
    )
    out = o.read().decode().strip()
    print(f'=== {p} ===')
    print(out or '(none)')
    print()

c.close()
