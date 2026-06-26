"""Fix listHotPublicGames provider filter on server + verify routes."""
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

old_fn = """export async function listHotPublicGames({ page = 1, limit = 48 } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 48));
  const offset = (safePage - 1) * safeLimit;

  const whereClause = [
    'g.is_hot = 1',
    'g.is_active = 1',
    'g.status = \\'active\\'',
  ].join(' AND ');

  const [rows] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, g.image_url, g.custom_image_url, g.provider_id,
            g.is_hot, g.is_featured, g.is_live,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     LEFT JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.sort_order ASC, g.name ASC, g.id ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset],
  );"""

new_fn = """export async function listHotPublicGames({ page = 1, limit = 48 } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 48));
  const offset = (safePage - 1) * safeLimit;

  const whereClause = [
    'g.is_hot = 1',
    'g.is_active = 1',
    'g.status = \\'active\\'',
    PUBLIC_PROVIDER_ACTIVE_SQL,
  ].join(' AND ');

  const [rows] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, g.image_url, g.custom_image_url, g.provider_id,
            g.is_hot, g.is_featured, g.is_live,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.sort_order ASC, g.name ASC, g.id ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset],
  );"""

if old_fn in cat:
    cat = cat.replace(old_fn, new_fn, 1)
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('PATCHED listHotPublicGames')
else:
    print('SKIP: listHotPublicGames pattern not found')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js')
err = e.read().decode()
print('syntax:', err[:300] or 'ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env')
print(o.read().decode('utf-8', 'replace')[:200])
time.sleep(3)

# find hot route
_, o, _ = c.exec_command(f'grep -rn "hot" {ROOT}/backend/routes/publicSiteGamesRoutes.js')
print('routes:', o.read().decode())

tests = [
    'curl -s "http://127.0.0.1:3001/api/site/games?category=hot&limit=5"',
    'curl -s "http://127.0.0.1:3001/api/site/games?category=slots&limit=3"',
]
for cmd in tests:
    _, o, _ = c.exec_command(cmd)
    raw = o.read().decode()
    try:
        d = json.loads(raw)
        items = d.get('data', [])
        print(cmd.split('?')[1], 'count=', len(items))
    except Exception:
        print(cmd, raw[:200])

# disable 100HP again and test
c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=0, status='inactive' WHERE code='100HP'; "
    "UPDATE games SET is_active=0, status='inactive' "
    "WHERE provider_id=(SELECT id FROM providers WHERE code='100HP' LIMIT 1);\""
)
time.sleep(2)

_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/search?q=100hp&limit=20"')
d = json.loads(o.read())
payload = d.get('data', d)
print('search disabled:', len(payload.get('games', [])), len(payload.get('providers', [])))

_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/games?category=hot&limit=200"')
d = json.loads(o.read())
hp = [x for x in d.get('data', []) if (x.get('providerCode') or '') == '100HP']
print('hot 100HP games:', len(hp), 'total hot:', len(d.get('data', [])))

c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"UPDATE providers SET enabled=1, status='active' WHERE code='100HP'; "
    "UPDATE games SET is_active=1, status='active' "
    "WHERE provider_id=(SELECT id FROM providers WHERE code='100HP' LIMIT 1);\""
)
print('restored')
c.close()
