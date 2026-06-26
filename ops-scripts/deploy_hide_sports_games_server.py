"""Hide marked sports games from frontend only - server deploy."""
import paramiko
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
CAT = f'{ROOT}/backend/services/gameCatalogService.js'

# Marked in screenshot: 568win Sportsbook, SABA Sports, SBO Sportsbook, SBO VirtualSports
HIDDEN_GAME_IDS = '11456,19512,11454,11453'

HIDDEN_GAMES_BLOCK = """
const HIDDEN_SITE_GAME_IDS = new Set(
  String(process.env.HMK_HIDDEN_GAME_IDS || '11456,19512,11454,11453')
    .split(',')
    .map((id) => Number(String(id || '').trim()))
    .filter((id) => Number.isFinite(id) && id > 0),
);

function appendHiddenSiteGameFilter(conditions, params) {
  const hiddenGameIds = [...HIDDEN_SITE_GAME_IDS];
  if (!hiddenGameIds.length) return;
  conditions.push(`g.id NOT IN (${hiddenGameIds.map(() => '?').join(', ')})`);
  params.push(...hiddenGameIds);
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')
orig = cat

if 'HIDDEN_SITE_GAME_IDS' not in cat:
    cat = cat.replace(
        'const HIDDEN_SITE_PROVIDER_CODES = new Set(',
        HIDDEN_GAMES_BLOCK + '\nconst HIDDEN_SITE_PROVIDER_CODES = new Set(',
        1,
    )
    print('PATCH_OK hidden game ids constant')

if 'appendHiddenSiteGameFilter(conditions, params)' not in cat:
    cat = cat.replace(
        """  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  if (hiddenProviders.length) {
    conditions.push(`p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`);
    params.push(...hiddenProviders);
  }

  if (category === 'hot') {""",
        """  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  if (hiddenProviders.length) {
    conditions.push(`p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`);
    params.push(...hiddenProviders);
  }
  appendHiddenSiteGameFilter(conditions, params);

  if (category === 'hot') {""",
        1,
    )
    print('PATCH_OK buildSiteGameFilters')

# listHotPublicGames - use dynamic conditions
old_hot_where = """  const whereClause = [
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

new_hot_where = """  const hotConditions = [
    'g.is_hot = 1',
    'g.is_active = 1',
    'g.status = \\'active\\'',
    PUBLIC_PROVIDER_ACTIVE_SQL,
  ];
  const hotParams = [];
  appendHiddenSiteGameFilter(hotConditions, hotParams);
  const whereClause = hotConditions.join(' AND ');

  const [rows] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, g.image_url, g.custom_image_url, g.provider_id,
            g.is_hot, g.is_featured, g.is_live,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.sort_order ASC, g.name ASC, g.id ASC
     LIMIT ? OFFSET ?`,
    [...hotParams, safeLimit, offset],
  );"""

if old_hot_where in cat and 'appendHiddenSiteGameFilter(hotConditions' not in cat:
    cat = cat.replace(old_hot_where, new_hot_where, 1)
    print('PATCH_OK listHotPublicGames')

# searchSiteCatalog game query
old_search_games = """  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  const hiddenClause = hiddenProviders.length
    ? `AND p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`
    : '';

  const [providerRows] = await pool.query("""

new_search_games = """  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  const hiddenClause = hiddenProviders.length
    ? `AND p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`
    : '';
  const hiddenGameIds = [...HIDDEN_SITE_GAME_IDS];
  const hiddenGameClause = hiddenGameIds.length
    ? `AND g.id NOT IN (${hiddenGameIds.map(() => '?').join(', ')})`
    : '';

  const [providerRows] = await pool.query("""

if 'hiddenGameClause' not in cat:
    cat = cat.replace(old_search_games, new_search_games, 1)
    print('PATCH_OK search hidden clause var')

old_game_search_where = """     WHERE g.is_active = 1 AND g.status = 'active'
       AND p.enabled = 1 AND p.status = 'active'
       AND (g.name LIKE ? OR g.code LIKE ? OR p.name LIKE ? OR p.code LIKE ?)
       ${hiddenClause}
     ORDER BY g.is_hot DESC, g.sort_order ASC, g.name ASC
     LIMIT ?`,
    [like, like, like, like, ...hiddenProviders, safeLimit],
  );"""

new_game_search_where = """     WHERE g.is_active = 1 AND g.status = 'active'
       AND p.enabled = 1 AND p.status = 'active'
       AND (g.name LIKE ? OR g.code LIKE ? OR p.name LIKE ? OR p.code LIKE ?)
       ${hiddenClause}
       ${hiddenGameClause}
     ORDER BY g.is_hot DESC, g.sort_order ASC, g.name ASC
     LIMIT ?`,
    [like, like, like, like, ...hiddenProviders, ...hiddenGameIds, safeLimit],
  );"""

if '${hiddenGameClause}' not in cat:
    cat = cat.replace(old_game_search_where, new_game_search_where, 1)
    print('PATCH_OK search game query')

if cat != orig:
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('WROTE gameCatalogService.js')
else:
    print('NO_CHANGES')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js')
err = e.read().decode()
print('syntax:', err[:300] or 'ok')
if err.strip():
    c.close()
    sys.exit(1)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:150])
time.sleep(3)

# verify sports API
verify = r'''
curl -s "http://127.0.0.1:3001/api/site/games?category=sports&limit=50"
'''
_, o, _ = c.exec_command(verify, timeout=30)
data = json.loads(o.read().decode())
games = data.get('data', [])
names = [g.get('title') or g.get('name') for g in games]
print('sports count:', len(games))
print('games:', names)
hidden = ['568win Sportsbook', 'SABA Sports', 'SBO Sportsbook', 'SBO VirtualSports (VS)']
print('hidden still visible:', [n for n in hidden if n in names])
visible_expected = ['BtiGaming', 'CMD-Game', 'IBC', 'Lucky Sports', 'SBO Sports', 'UG']
print('expected visible:', [n for n in visible_expected if n in names])

c.close()
print('DONE')
