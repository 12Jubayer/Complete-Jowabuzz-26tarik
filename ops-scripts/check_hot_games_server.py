"""Check hot games in DB on server."""
import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

queries = [
    ("hot_games_total", "SELECT COUNT(*) FROM games WHERE is_hot=1 AND is_active=1 AND status='active'"),
    ("hot_with_active_provider", """
        SELECT COUNT(*) FROM games g
        INNER JOIN providers p ON p.id = g.provider_id
        WHERE g.is_hot=1 AND g.is_active=1 AND g.status='active'
        AND p.enabled=1 AND p.status='active'
    """),
    ("100HP_status", "SELECT id, code, enabled, status FROM providers WHERE code='100HP'"),
    ("disabled_providers", "SELECT COUNT(*) FROM providers WHERE enabled=0 OR status!='active'"),
]

for name, sql in queries:
    cmd = f"mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"{sql.strip()}\""
    _, o, e = c.exec_command(cmd, timeout=30)
    print(f'{name}:', o.read().decode().strip(), e.read().decode().strip())

c.close()
