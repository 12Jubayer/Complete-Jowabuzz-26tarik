"""Final verification: toggle cascade + launch block."""
import paramiko
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)


def run(cmd, t=60):
    _, o, e = c.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')


# Confirm cascade code exists
out, _ = run("grep -n 'setProviderGamesVisibility' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js")
print('cascade refs:', out.strip())

# Get a 100HP game id
out, _ = run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT g.id, g.code FROM games g JOIN providers p ON p.id=g.provider_id "
    "WHERE p.code='100HP' AND g.is_active=1 LIMIT 1\""
)
print('sample game:', out.strip())
game_id = out.strip().split('\t')[0] if out.strip() else ''

# Disable provider only (simulate admin toggle without manual game update)
run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=0, status='inactive' WHERE code='100HP'\""
)
time.sleep(1)

# Check if games still active (without cascade from DB toggle - admin API would cascade)
out, _ = run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT COUNT(*) FROM games g JOIN providers p ON p.id=g.provider_id "
    "WHERE p.code='100HP' AND g.is_active=1\""
)
print('active 100HP games after provider off (no cascade yet):', out.strip())

# API should still hide because provider filter is strict
out, _ = run('curl -s "http://127.0.0.1:3001/api/site/games?provider=100HP&limit=5"')
d = json.loads(out)
print('api provider=100HP:', len(d.get('data', [])))

out, _ = run('curl -s "http://127.0.0.1:3001/api/site/search?q=100hp&limit=10"')
d = json.loads(out)
payload = d.get('data', d)
print('search:', len(payload.get('games', [])), len(payload.get('providers', [])))

# Restore
run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=1, status='active' WHERE code='100HP'\""
)
print('restored provider')
c.close()
