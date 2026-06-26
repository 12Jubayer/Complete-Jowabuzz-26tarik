"""Fix buildSiteGameFilters hidden games filter on server."""
import paramiko
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
CAT = f'{ROOT}/backend/services/gameCatalogService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')

old = """  if (provider) {
    conditions.push('(p.code = ? OR p.name = ?)');
    params.push(provider, provider);
  }

  return { whereClause: conditions.join(' AND '), params };
}"""

new = """  if (provider) {
    conditions.push('(p.code = ? OR p.name = ?)');
    params.push(provider, provider);
  }

  appendHiddenSiteGameFilter(conditions, params);

  return { whereClause: conditions.join(' AND '), params };
}"""

if 'appendHiddenSiteGameFilter(conditions, params)' not in cat:
    if old not in cat:
        print('PATTERN_NOT_FOUND')
        sys.exit(1)
    cat = cat.replace(old, new, 1)
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('PATCHED buildSiteGameFilters')
else:
    print('ALREADY_HAS_FILTER')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js')
print('syntax:', e.read().decode()[:200] or 'ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
time.sleep(3)

_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/games?category=sports&limit=50"')
data = json.loads(o.read().decode())
games = data.get('data', [])
names = [g.get('title') or g.get('name') for g in games]
print('sports count:', len(games))
print('games:', names)
hidden = ['568win Sportsbook', 'SABA Sports', 'SBO Sportsbook', 'SBO VirtualSports (VS)']
print('hidden visible:', [n for n in hidden if n in names])

_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/search?q=saba&limit=20"')
s = json.loads(o.read().decode())
sg = [g.get('title') or g.get('name') for g in s.get('data', {}).get('games', [])]
print('search saba games:', sg)

c.close()
print('DONE')
