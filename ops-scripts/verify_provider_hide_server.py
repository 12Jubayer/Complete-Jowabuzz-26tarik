"""Verify disabled providers are hidden from all public APIs."""
import paramiko
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)


def run(cmd, timeout=60):
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')


out, _ = run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT id, enabled FROM providers WHERE code='100HP' LIMIT 1\""
)
print('100HP row:', out.strip())

run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=0, status='inactive' WHERE code='100HP'; "
    "UPDATE games SET is_active=0, status='inactive' "
    "WHERE provider_id=(SELECT id FROM providers WHERE code='100HP' LIMIT 1);\""
)
time.sleep(2)

checks = [
    ('search', 'curl -s "http://127.0.0.1:3001/api/site/search?q=100hp&limit=20"'),
    ('games_100HP', 'curl -s "http://127.0.0.1:3001/api/site/games?provider=100HP&limit=20"'),
    ('providers', 'curl -s "http://127.0.0.1:3001/api/site/providers?category=all"'),
    ('hot', 'curl -s "http://127.0.0.1:3001/api/site/hot-games?limit=200"'),
]

for name, cmd in checks:
    out, err = run(cmd)
    try:
        data = json.loads(out)
        if name == 'search':
            payload = data.get('data', data)
            g = len(payload.get('games', []))
            p = len(payload.get('providers', []))
            print(f'{name}: games={g} providers={p}')
        elif name == 'providers':
            items = data.get('data', data.get('providers', []))
            codes = [x.get('code') for x in items if isinstance(x, dict)]
            print(f'{name}: count={len(items)} has100HP={"100HP" in codes}')
        elif name == 'hot':
            items = data.get('data', data.get('games', []))
            hp = sum(
                1
                for x in items
                if (x.get('providerCode') or x.get('provider_code')) == '100HP'
            )
            print(f'{name}: total={len(items)} 100HP={hp}')
        else:
            items = data.get('data', data.get('games', []))
            print(f'{name}: count={len(items)}')
    except Exception as ex:
        print(f'{name}: parse_err {ex} raw={out[:300]}')

run(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=1, status='active' WHERE code='100HP'; "
    "UPDATE games SET is_active=1, status='active' "
    "WHERE provider_id=(SELECT id FROM providers WHERE code='100HP' LIMIT 1);\""
)
print('restored 100HP')
c.close()
