"""Ensure disabled providers hidden everywhere on frontend - server only."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
CAT = f'{ROOT}/backend/services/gameCatalogService.js'
CTRL = f'{ROOT}/backend/controllers/gameController.js'

HELPER = """
const PUBLIC_PROVIDER_ACTIVE_SQL = 'p.enabled = 1 AND p.status = \\'active\\'';

async function setProviderGamesVisibility(connection, providerId, visible) {
  const active = visible ? 1 : 0;
  const status = visible ? 'active' : 'inactive';
  await connection.query(
    `UPDATE games
     SET is_active = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE provider_id = ?`,
    [active, status, providerId],
  );
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')
orig = cat

if 'PUBLIC_PROVIDER_ACTIVE_SQL' not in cat:
    cat = cat.replace(
        'function buildSiteGameFilters({ category, provider }) {',
        HELPER + '\nfunction buildSiteGameFilters({ category, provider }) {',
        1,
    )
    print('PATCH_OK helper')

cat = cat.replace(
    "    '(p.enabled = 1 OR p.enabled IS NULL)',\n    'p.status = \\'active\\'',",
    "    PUBLIC_PROVIDER_ACTIVE_SQL,",
)
cat = cat.replace(
    "       AND (p.enabled = 1 OR p.enabled IS NULL) AND p.status = 'active'",
    "       AND p.enabled = 1 AND p.status = 'active'",
)

# listHotPublicGames - add provider filter
old_hot = """  const whereClause = [
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
     WHERE ${whereClause}"""

new_hot = """  const whereClause = [
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
     WHERE ${whereClause}"""

if 'INNER JOIN providers p ON p.id = g.provider_id\n     WHERE ${whereClause}' not in cat and 'LEFT JOIN providers p ON p.id = g.provider_id\n     WHERE ${whereClause}' in cat:
    cat = cat.replace(old_hot, new_hot, 1)
    print('PATCH_OK listHotPublicGames')

# listPublicGameProviders strict filter
cat = cat.replace(
    "       AND COALESCE(p.enabled, 1) = 1",
    "       AND p.enabled = 1",
)

# toggleProviderEnabled - cascade games hide/show
old_toggle = """  const [result] = await pool.query(
    `UPDATE providers
     SET enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [normalizedValue, status, providerId],
  );

  if (!result.affectedRows) {
    const error = new Error('Provider not found');
    error.statusCode = 404;
    throw error;
  }

  const [[row]] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers WHERE id = ? LIMIT 1`,
    [providerId],
  );

  return { data: mapProviderRow(row) };
}

export async function syncProvidersFromExternal() {"""

new_toggle = """  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE providers
       SET enabled = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [normalizedValue, status, providerId],
    );

    if (!result.affectedRows) {
      const error = new Error('Provider not found');
      error.statusCode = 404;
      throw error;
    }

    await setProviderGamesVisibility(connection, providerId, enabled);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [[row]] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers WHERE id = ? LIMIT 1`,
    [providerId],
  );

  return { data: mapProviderRow(row) };
}

export async function syncProvidersFromExternal() {"""

if 'setProviderGamesVisibility(connection, providerId, enabled)' not in cat:
    cat = cat.replace(old_toggle, new_toggle, 1)
    print('PATCH_OK toggleProviderEnabled cascade')

# updateProviderDetails - cascade when enabled changes
if 'enabled !== undefined' in cat and 'setProviderGamesVisibility(connection, providerId, enabled)' in cat:
    old_update_end = """  const [result] = await pool.query(
    `UPDATE providers SET ${updates.join(', ')} WHERE id = ?`,
    params,
  );

  if (!result.affectedRows) {
    const error = new Error('Provider not found');
    error.statusCode = 404;
    throw error;
  }

  const [[row]] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers WHERE id = ? LIMIT 1`,
    [providerId],
  );

  return { data: mapProviderRow(row), message: 'Provider updated' };
}"""

    new_update_end = """  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE providers SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    if (!result.affectedRows) {
      const error = new Error('Provider not found');
      error.statusCode = 404;
      throw error;
    }

    if (enabled !== undefined) {
      await setProviderGamesVisibility(connection, providerId, enabled);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [[row]] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers WHERE id = ? LIMIT 1`,
    [providerId],
  );

  return { data: mapProviderRow(row), message: 'Provider updated' };
}"""

    if 'if (enabled !== undefined) {\n      await setProviderGamesVisibility' not in cat:
        cat = cat.replace(old_update_end, new_update_end, 1)
        print('PATCH_OK updateProviderDetails cascade')

if cat != orig:
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('WROTE gameCatalogService.js')

# gameController fixes
with sftp.open(CTRL, 'r') as f:
    ctrl = f.read().decode('utf-8').replace('\r\n', '\n')
c_orig = ctrl

ctrl = ctrl.replace(
    "  const providerActive =\n    game.provider_status === 'active' && (game.provider_enabled === 1 || game.provider_enabled === null);",
    "  const providerActive =\n    game.provider_status === 'active' && game.provider_enabled === 1;",
)

ctrl = ctrl.replace(
    "         AND p.status = 'active'\n         AND (p.enabled = 1 OR p.enabled IS NULL)${providerClause}",
    "         AND p.enabled = 1\n         AND p.status = 'active'${providerClause}",
)

if ctrl != c_orig:
    with sftp.open(CTRL, 'w') as f:
        f.write(ctrl.encode('utf-8'))
    print('WROTE gameController.js')

sftp.close()

_, o, e = c.exec_command(
    f'cd {ROOT}/backend && node --check services/gameCatalogService.js && node --check controllers/gameController.js',
    timeout=30,
)
print('syntax:', e.read().decode()[:500] or 'ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:200])
time.sleep(3)

# test: disable 100HP and verify search/games
test = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});

const [[p]] = await pool.query("SELECT id FROM providers WHERE code='100HP' LIMIT 1");
if (p) {
  await pool.query("UPDATE providers SET enabled=0, status='inactive' WHERE id=?", [p.id]);
  await pool.query("UPDATE games SET is_active=0, status='inactive' WHERE provider_id=?", [p.id]);
}
const { searchSiteCatalog } = await import('./services/gameCatalogService.js');
const { listHotPublicGames, listSiteGames } = await import('./services/gameCatalogService.js');
const s = await searchSiteCatalog({ query: '100hp', limit: 10 });
const h = await listHotPublicGames({ limit: 200 });
const g = await listSiteGames({ category: 'all', provider: '100HP', limit: 10 });
console.log('search games', s.data.games.length, 'providers', s.data.providers.length);
console.log('hot with 100HP', h.data.filter(x => x.providerCode==='100HP').length);
console.log('list provider 100HP', g.data.length);
await pool.query("UPDATE providers SET enabled=1, status='active' WHERE code='100HP'");
await pool.query("UPDATE games SET is_active=1, status='active' WHERE provider_id=?", [p?.id || 0]);
await pool.end();
NODE
'''
_, o, e = c.exec_command(test, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:800])

c.close()
print('DONE')
