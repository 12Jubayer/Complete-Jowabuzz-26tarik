"""Fix slot/slots category mismatch in listSiteGames on server."""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
with sftp.open(REMOTE, 'r') as f:
    text = f.read().decode('utf-8').replace('\r\n', '\n')

old = """  } else if (category && category !== 'all') {
    conditions.push('g.category = ?');
    params.push(category);
  }"""

new = """  } else if (category && category !== 'all') {
    const normalizedCategory = String(category).trim().toLowerCase();
    if (normalizedCategory === 'slot' || normalizedCategory === 'slots') {
      conditions.push('g.category IN (?, ?)');
      params.push('slot', 'slots');
    } else if (normalizedCategory === 'casino' || normalizedCategory === 'casino live') {
      conditions.push('g.category IN (?, ?, ?)');
      params.push('casino', 'casino live', 'live');
    } else {
      conditions.push('g.category = ?');
      params.push(normalizedCategory);
    }
  }"""

if old in text:
    text = text.replace(old, new, 1)
    with sftp.open(REMOTE, 'w') as f:
        f.write(text.encode('utf-8'))
    print('PATCH_OK buildSiteGameFilters')
else:
    print('PATCH_SKIP - block not found')
    idx = text.find('buildSiteGameFilters')
    print(text[idx:idx+600])

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8','replace')[:100])

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/games?category=slots&provider=JL&limit=3'", timeout=30)
print('JL slots API:', o.read().decode('utf-8','replace')[:600])

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/games?category=slots&limit=1' | python3 -c \"import sys,json;d=json.load(sys.stdin);print('total sample',len(d.get('data',[])))\"", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
