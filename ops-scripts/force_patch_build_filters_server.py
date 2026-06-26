"""Force patch buildSiteGameFilters on server."""
import paramiko
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CAT = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')

needle = 'function buildSiteGameFilters'
start = cat.find(needle)
end = cat.find('\nexport async function listHotPublicGames', start)
fn = cat[start:end]
print('has filter in fn:', 'appendHiddenSiteGameFilter(conditions, params)' in fn)

if 'appendHiddenSiteGameFilter(conditions, params)' not in fn:
    fn2 = fn.replace(
        "  if (provider) {\n    conditions.push('(p.code = ? OR p.name = ?)');\n    params.push(provider, provider);\n  }\n\n  return { whereClause: conditions.join(' AND '), params };\n}",
        "  if (provider) {\n    conditions.push('(p.code = ? OR p.name = ?)');\n    params.push(provider, provider);\n  }\n\n  appendHiddenSiteGameFilter(conditions, params);\n\n  return { whereClause: conditions.join(' AND '), params };\n}",
        1,
    )
    if fn2 == fn:
        print('REPLACE_FAILED')
        print(repr(fn[-200:]))
        sys.exit(1)
    cat = cat[:start] + fn2 + cat[end:]
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('PATCHED')

sftp.close()
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node --check services/gameCatalogService.js')
print('syntax:', e.read().decode() or 'ok')
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env')
time.sleep(3)
_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/games?category=sports&limit=50"')
data = json.loads(o.read().decode())
names = [g.get('title') or g.get('name') for g in data.get('data', [])]
print('count', len(names), names)
hidden = ['568win Sportsbook', 'SABA Sports', 'SBO Sportsbook', 'SBO VirtualSports (VS)']
print('hidden:', [n for n in hidden if n in names])
c.close()
