"""Fix fish/fishing category mismatch on production server only."""
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
original = text

# 1) buildSiteGameFilters - add fish/fishing alias
old_filters = """    } else if (normalizedCategory === 'casino' || normalizedCategory === 'casino live') {
      conditions.push('g.category IN (?, ?, ?)');
      params.push('casino', 'casino live', 'live');
    } else {
      conditions.push('g.category = ?');
      params.push(normalizedCategory);
    }"""

new_filters = """    } else if (normalizedCategory === 'casino' || normalizedCategory === 'casino live') {
      conditions.push('g.category IN (?, ?, ?)');
      params.push('casino', 'casino live', 'live');
    } else if (normalizedCategory === 'fish' || normalizedCategory === 'fishing') {
      conditions.push('g.category IN (?, ?)');
      params.push('fish', 'fishing');
    } else {
      conditions.push('g.category = ?');
      params.push(normalizedCategory);
    }"""

if old_filters in text:
    text = text.replace(old_filters, new_filters, 1)
    print('PATCH_OK buildSiteGameFilters fish/fishing')
else:
    print('PATCH_SKIP buildSiteGameFilters - block not found')

# 2) listSiteProviders - map fishing <-> fish
old_providers = """    const apiCategory = normalizedCategory === 'slot' ? 'slots' : normalizedCategory;
    const [rows] = await pool.query(
      `SELECT p.id, p.code, p.name, p.provider_logo,
              MIN(COALESCE(g.sort_order, 9999)) AS sort_rank,
              MAX(COALESCE(g.custom_image_url, g.image_url)) AS sample_image,
              MAX(g.name) AS sample_game_name
       FROM games g
       INNER JOIN providers p ON p.id = g.provider_id
       WHERE g.is_active = 1
         AND g.status = 'active'
         AND (p.enabled = 1 OR p.enabled IS NULL)
         AND p.status = 'active'
         AND g.category IN (?, ?)
         ${[...HIDDEN_SITE_PROVIDER_CODES].length
    ? `AND p.code NOT IN (${[...HIDDEN_SITE_PROVIDER_CODES].map(() => '?').join(', ')})`
    : ''}
       GROUP BY p.id, p.code, p.name, p.provider_logo
       ORDER BY sort_rank ASC, p.name ASC`,
      [
        apiCategory,
        (normalizedCategory === 'slot' || normalizedCategory === 'slots') ? 'slot' : apiCategory,
        ...[...HIDDEN_SITE_PROVIDER_CODES],
      ],
    );"""

new_providers = """    const apiCategory =
      normalizedCategory === 'slot'
        ? 'slots'
        : (normalizedCategory === 'fish' || normalizedCategory === 'fishing')
          ? 'fishing'
          : normalizedCategory;
    const secondaryCategory =
      (normalizedCategory === 'slot' || normalizedCategory === 'slots')
        ? 'slot'
        : (normalizedCategory === 'fish' || normalizedCategory === 'fishing')
          ? 'fish'
          : apiCategory;
    const [rows] = await pool.query(
      `SELECT p.id, p.code, p.name, p.provider_logo,
              MIN(COALESCE(g.sort_order, 9999)) AS sort_rank,
              MAX(COALESCE(g.custom_image_url, g.image_url)) AS sample_image,
              MAX(g.name) AS sample_game_name
       FROM games g
       INNER JOIN providers p ON p.id = g.provider_id
       WHERE g.is_active = 1
         AND g.status = 'active'
         AND (p.enabled = 1 OR p.enabled IS NULL)
         AND p.status = 'active'
         AND g.category IN (?, ?)
         ${[...HIDDEN_SITE_PROVIDER_CODES].length
    ? `AND p.code NOT IN (${[...HIDDEN_SITE_PROVIDER_CODES].map(() => '?').join(', ')})`
    : ''}
       GROUP BY p.id, p.code, p.name, p.provider_logo
       ORDER BY sort_rank ASC, p.name ASC`,
      [
        apiCategory,
        secondaryCategory,
        ...[...HIDDEN_SITE_PROVIDER_CODES],
      ],
    );"""

if old_providers in text:
    text = text.replace(old_providers, new_providers, 1)
    print('PATCH_OK listSiteProviders fish/fishing')
else:
    print('PATCH_SKIP listSiteProviders - block not found')

if text != original:
    with sftp.open(REMOTE, 'w') as f:
        f.write(text.encode('utf-8'))
else:
    print('NO_CHANGES')

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:200])

import time
time.sleep(3)

_, o, _ = c.exec_command(
    "curl -s 'http://127.0.0.1:3001/api/site/games?category=fishing&limit=3'",
    timeout=30,
)
print('fishing games:', o.read().decode('utf-8', 'replace')[:700])

_, o, _ = c.exec_command(
    "curl -s 'http://127.0.0.1:3001/api/site/providers?category=fishing&limit=5'",
    timeout=30,
)
print('fishing providers:', o.read().decode('utf-8', 'replace')[:700])

_, o, _ = c.exec_command(
    "curl -s 'http://127.0.0.1:3001/api/site/games?category=fishing&provider=JL&limit=3'",
    timeout=30,
)
print('JL fishing:', o.read().decode('utf-8', 'replace')[:500])

c.close()
