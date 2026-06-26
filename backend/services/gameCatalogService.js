import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { resolveGameImage } from './adminGameImageService.js';
import { fetchOracleGameCatalog, getGamingGatewaySettingsInternal, isGamingGatewayActive } from './gamingGatewayService.js';
import { isGamesPlayEnabled, isOracleDisabled } from './hmkApiService.js';
import { fetchOracleProviders, getOracleApiVersion } from './oracleGamesApiClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORACLE_CATALOG_BACKUP_DIR = path.join(__dirname, '..', 'backups');

const GAME_FLAG_FIELDS = ['is_hot', 'is_featured', 'is_live', 'is_active'];
const FLAG_BODY_MAP = {
  isHot: 'is_hot',
  isFeatured: 'is_featured',
  isLive: 'is_live',
  isActive: 'is_active',
  hot: 'is_hot',
  featured: 'is_featured',
  live: 'is_live',
  active: 'is_active',
  is_hot: 'is_hot',
  is_featured: 'is_featured',
  is_live: 'is_live',
  is_active: 'is_active',
};

const HIDDEN_SITE_PROVIDER_CODES = new Set(
  String(process.env.HMK_HIDDEN_PROVIDER_CODES || '')
    .split(',')
    .map((code) => String(code || '').trim().toUpperCase())
    .filter(Boolean),
);

const EXTERNAL_PROVIDERS = [
  { code: '2BC', name: '2BC' },
  { code: '2J', name: '2J' },
  { code: '568WIN', name: '568WIN SPORTS' },
  { code: '5G', name: '5G' },
  { code: '888KING', name: '888King H5' },
  { code: 'ACEWIN', name: 'AceWin Seamless' },
  { code: 'ADVANTPLAY', name: 'ADVANTPLAY' },
  { code: 'PLAYTECH', name: 'PLAYTECH SEAMLESS' },
  { code: 'REDTIGER', name: 'RED TIGER' },
  { code: 'ENDORPHINA', name: 'Endorphina Slots' },
  { code: 'JILI', name: 'Jili' },
  { code: 'PG', name: 'PG Soft' },
  { code: 'PP', name: 'Pragmatic Play' },
  { code: 'SPRIBE', name: 'Spribe' },
  { code: 'EVOLUTION', name: 'Evolution' },
];

async function backupOracleCatalogData(pool) {
  const [providers] = await pool.query(
    `SELECT id, code, name, adapter_key, status, enabled, updated_at FROM providers`,
  );
  const [games] = await pool.query(
    `SELECT id, provider_id, code, name, category, game_type, image_url, is_hot, is_featured, is_live, is_active, status, updated_at
     FROM games`,
  );

  if (!fs.existsSync(ORACLE_CATALOG_BACKUP_DIR)) {
    fs.mkdirSync(ORACLE_CATALOG_BACKUP_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(ORACLE_CATALOG_BACKUP_DIR, `oracle-catalog-backup-${stamp}.json`);
  const payload = {
    backedUpAt: new Date().toISOString(),
    apiVersion: getOracleApiVersion(),
    providers,
    games,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));

  return {
    filePath,
    providerCount: providers.length,
    gameCount: games.length,
  };
}

function normalizeGameType(value, fallback = 'SLOT') {
  const raw = String(value || fallback || 'SLOT').trim().toUpperCase();
  if (['SLOT', 'SLOTS'].includes(raw)) return 'SLOT';
  if (['LIVE', 'CASINO', 'TABLE'].includes(raw)) return raw === 'TABLE' ? 'LIVE' : raw;
  if (['SPORTS', 'SPORT'].includes(raw)) return 'SPORTS';
  if (['FISH', 'FISHING'].includes(raw)) return 'FISH';
  if (['CRASH', 'ARCADE', 'LOTTERY'].includes(raw)) return raw;
  return raw || 'SLOT';
}

function normalizeFlagPayload(payload = {}) {
  const normalized = {};
  Object.entries(payload).forEach(([key, value]) => {
    const field = FLAG_BODY_MAP[key];
    if (field && value !== undefined) {
      normalized[field] = value ? 1 : 0;
    }
  });
  return normalized;
}

function mapProviderRow(row) {
  return {
    id: row.id,
    providerCode: row.code,
    providerName: row.name,
    providerLogo: row.provider_logo || null,
    enabled: row.enabled === 1 || row.enabled === true,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGameRow(row) {
  const isActive = row.is_active === 1 || row.is_active === true || row.status === 'active';
  const displayImage = resolveGameImage(row);

  return {
    id: row.id,
    gameCode: row.code,
    gameName: row.name,
    providerId: row.provider_id,
    providerCode: row.provider_code,
    providerName: row.provider_name,
    provider: row.provider_name,
    imageUrl: row.image_url,
    displayImageUrl: displayImage,
    gameType: normalizeGameType(row.game_type || row.category),
    category: row.category,
    isHot: row.is_hot === 1 || row.is_hot === true,
    isFeatured: row.is_featured === 1 || row.is_featured === true,
    isLive: row.is_live === 1 || row.is_live === true,
    isActive,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSiteGameRow(row) {
  const image = resolveGameImage(row);
  return {
    id: row.code,
    code: row.code,
    title: row.name,
    name: row.name,
    image,
    imageUrl: image,
    category: row.category,
    provider: row.provider_name,
    providerCode: row.provider_code,
    providerId: row.provider_id,
    gameId: row.id,
    isHot: row.is_hot === 1,
    isFeatured: row.is_featured === 1,
    isLive: row.is_live === 1,
  };
}

async function runAlter(pool, sql) {
  try {
    await pool.query(sql);
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

export async function migrateGameCatalogSchema() {
  const pool = getPool();

  await runAlter(pool, `ALTER TABLE providers ADD COLUMN provider_logo VARCHAR(500) NULL AFTER name`);
  await runAlter(pool, `ALTER TABLE providers ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER status`);
  await runAlter(
    pool,
    `ALTER TABLE providers ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
  );

  await runAlter(pool, `ALTER TABLE games ADD COLUMN custom_image_url VARCHAR(500) NULL AFTER image_url`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN game_type VARCHAR(50) NULL AFTER category`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN is_hot TINYINT(1) NOT NULL DEFAULT 0 AFTER game_type`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_hot`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN is_live TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_live`);
  await runAlter(pool, `ALTER TABLE games ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_active`);
  await runAlter(
    pool,
    `ALTER TABLE games ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
  );

  await pool.query(`UPDATE providers SET enabled = IF(status = 'active', 1, 0) WHERE enabled IS NULL`);
  await pool.query(`UPDATE games SET is_active = IF(status = 'active', 1, 0)`);
  await pool.query(
    `UPDATE games SET game_type = UPPER(category) WHERE game_type IS NULL OR TRIM(game_type) = ''`,
  );
}

function buildGameFilters({ tab, search, providerCode }) {
  const conditions = ['1=1'];
  const params = [];

  if (search) {
    conditions.push('(g.name LIKE ? OR g.code LIKE ? OR p.name LIKE ? OR p.code LIKE ? OR g.game_type LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  if (providerCode) {
    conditions.push('p.code = ?');
    params.push(providerCode);
  }

  return { whereClause: conditions.join(' AND '), params };
}

async function fetchGameRowById(pool, gameId) {
  const [[row]] = await pool.query(
    `SELECT g.*, p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.id = ?
     LIMIT 1`,
    [gameId],
  );
  return row || null;
}

export async function listAdminGames({ tab = 'all', search = '', providerCode = '', page = 1, limit = 20 } = {}) {
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;

  const { whereClause, params } = buildGameFilters({ tab, search, providerCode });

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT g.*, p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.sort_order ASC, g.name ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    data: rows.map(mapGameRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRecords: Number(countRow.total || 0),
      totalPages: Math.max(1, Math.ceil(Number(countRow.total || 0) / safeLimit)),
    },
  };
}

export async function listAdminProviders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers
     ORDER BY name ASC`,
  );

  return { data: rows.map(mapProviderRow) };
}

export async function updateGameFlags(gameId, flags = {}) {
  const normalized = normalizeFlagPayload(flags);
  if (!Object.keys(normalized).length) {
    const error = new Error('At least one flag is required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const updates = Object.entries(normalized).map(([field]) => `${field} = ?`);
  const params = Object.values(normalized);

  if (normalized.is_active !== undefined) {
    updates.push('status = ?');
    params.push(normalized.is_active ? 'active' : 'inactive');
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(gameId);

  const [result] = await pool.query(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`, params);

  if (!result.affectedRows) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  const row = await fetchGameRowById(pool, gameId);
  return { data: mapGameRow(row) };
}

export async function bulkUpdateGameFlags({ updates = [], gameIds = [], flags = {} } = {}) {
  const pool = getPool();
  let affected = 0;

  if (Array.isArray(updates) && updates.length) {
    for (const item of updates) {
      const gameId = Number(item.id || item.gameId);
      if (!gameId) continue;

      const normalized = normalizeFlagPayload(item);
      if (!Object.keys(normalized).length) continue;

      const setParts = Object.keys(normalized).map((field) => `${field} = ?`);
      const params = Object.values(normalized);

      if (normalized.is_active !== undefined) {
        setParts.push('status = ?');
        params.push(normalized.is_active ? 'active' : 'inactive');
      }

      setParts.push('updated_at = CURRENT_TIMESTAMP');
      params.push(gameId);

      const [result] = await pool.query(
        `UPDATE games SET ${setParts.join(', ')} WHERE id = ?`,
        params,
      );
      affected += result.affectedRows;
    }

    return { updated: affected };
  }

  const normalized = normalizeFlagPayload(flags);
  if (!Array.isArray(gameIds) || !gameIds.length || !Object.keys(normalized).length) {
    const error = new Error('updates or gameIds with flags are required');
    error.statusCode = 400;
    throw error;
  }

  const ids = gameIds.map(Number).filter(Boolean);
  const placeholders = ids.map(() => '?').join(', ');
  const setParts = Object.keys(normalized).map((field) => `${field} = ?`);
  const params = Object.values(normalized);

  if (normalized.is_active !== undefined) {
    setParts.push('status = ?');
    params.push(normalized.is_active ? 'active' : 'inactive');
  }

  setParts.push('updated_at = CURRENT_TIMESTAMP');
  params.push(...ids);

  const [result] = await pool.query(
    `UPDATE games SET ${setParts.join(', ')} WHERE id IN (${placeholders})`,
    params,
  );

  return { updated: result.affectedRows };
}

export async function toggleGameField(gameId, field, value) {
  if (!GAME_FLAG_FIELDS.includes(field)) {
    const error = new Error('Invalid toggle field');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const normalizedValue = value ? 1 : 0;

  const updates = [`${field} = ?`, 'updated_at = CURRENT_TIMESTAMP'];
  const params = [normalizedValue];

  if (field === 'is_active') {
    updates.push(`status = ?`);
    params.push(normalizedValue ? 'active' : 'inactive');
  }

  params.push(gameId);

  const [result] = await pool.query(
    `UPDATE games SET ${updates.join(', ')} WHERE id = ?`,
    params,
  );

  if (!result.affectedRows) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  const [[row]] = await pool.query(
    `SELECT g.*, p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.id = ?
     LIMIT 1`,
    [gameId],
  );

  return { data: mapGameRow(row) };
}

export async function bulkToggleGames({ gameIds = [], field, value }) {
  if (!Array.isArray(gameIds) || !gameIds.length) {
    const error = new Error('gameIds are required');
    error.statusCode = 400;
    throw error;
  }

  if (!GAME_FLAG_FIELDS.includes(field)) {
    const error = new Error('Invalid toggle field');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const normalizedValue = value ? 1 : 0;
  const placeholders = gameIds.map(() => '?').join(', ');

  let sql = `UPDATE games SET ${field} = ?, updated_at = CURRENT_TIMESTAMP`;
  const params = [normalizedValue];

  if (field === 'is_active') {
    sql += `, status = ?`;
    params.push(normalizedValue ? 'active' : 'inactive');
  }

  sql += ` WHERE id IN (${placeholders})`;
  params.push(...gameIds);

  const [result] = await pool.query(sql, params);

  return { updated: result.affectedRows };
}

export async function toggleProviderEnabled(providerId, enabled) {
  const pool = getPool();
  const normalizedValue = enabled ? 1 : 0;
  const status = enabled ? 'active' : 'inactive';

  const [result] = await pool.query(
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

export async function syncProvidersFromExternal() {
  const pool = getPool();
  let inserted = 0;
  let updated = 0;

  for (const provider of EXTERNAL_PROVIDERS) {
    const [existing] = await pool.query(`SELECT id FROM providers WHERE code = ? LIMIT 1`, [provider.code]);

    if (existing.length) {
      await pool.query(
        `UPDATE providers
         SET name = ?, updated_at = CURRENT_TIMESTAMP
         WHERE code = ?`,
        [provider.name, provider.code],
      );
      updated += 1;
    } else {
      await pool.query(
        `INSERT INTO providers (code, name, adapter_key, status, enabled)
         VALUES (?, ?, 'demo', 'active', 1)`,
        [provider.code, provider.name],
      );
      inserted += 1;
    }
  }

  return { inserted, updated, total: EXTERNAL_PROVIDERS.length };
}

async function ensureOracleProvider(pool, providerCode, providerName = '') {
  const code = String(providerCode || '').trim();
  if (!code) return null;

  const [[existing]] = await pool.query(`SELECT id FROM providers WHERE code = ? LIMIT 1`, [code]);
  if (existing) {
    await pool.query(
      `UPDATE providers
       SET name = COALESCE(NULLIF(?, ''), name), adapter_key = 'oracle', status = 'active', enabled = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [providerName, existing.id],
    );
    return existing.id;
  }

  const [result] = await pool.query(
    `INSERT INTO providers (code, name, adapter_key, status, enabled)
     VALUES (?, ?, 'oracle', 'active', 1)`,
    [code, providerName || code],
  );
  return result.insertId;
}

export async function syncProvidersFromOracle() {
  if (isOracleDisabled()) {
    const error = new Error('Oracle provider sync is disabled. HMK is the active game provider.');
    error.statusCode = 400;
    throw error;
  }

  const gatewayActive = await isGamingGatewayActive();
  if (!gatewayActive) {
    const error = new Error('Gaming API gateway is not active');
    error.statusCode = 400;
    throw error;
  }

  const settings = await getGamingGatewaySettingsInternal();
  const providers = await fetchOracleProviders(settings);
  const pool = getPool();
  let inserted = 0;
  let updated = 0;

  for (const provider of providers) {
    const [[existing]] = await pool.query(`SELECT id FROM providers WHERE code = ? LIMIT 1`, [provider.code]);
    await ensureOracleProvider(pool, provider.code, provider.name);
    if (existing) updated += 1;
    else inserted += 1;
  }

  return { inserted, updated, total: providers.length };
}

export async function removeDummyOracleGames() {
  const pool = getPool();
  const [result] = await pool.query(
    `DELETE FROM games
     WHERE code IN ('ABC123', 'TEST001')
        OR code LIKE 'TEST%'
        OR name IN ('ABC123', 'TEST001')`,
  );
  return { removed: result.affectedRows || 0 };
}

export async function syncGamesFromOracle() {
  if (isOracleDisabled()) {
    const error = new Error('Oracle catalog sync is disabled. HMK is the active game provider.');
    error.statusCode = 400;
    throw error;
  }

  const gatewayActive = await isGamingGatewayActive();
  if (!gatewayActive) {
    const error = new Error('Gaming API gateway is not active');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const backup = await backupOracleCatalogData(pool);

  await syncProvidersFromOracle();
  await removeDummyOracleGames();

  const catalog = await fetchOracleGameCatalog();
  if (!catalog.length) {
    const error = new Error('No games returned from provider API');
    error.statusCode = 502;
    throw error;
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const game of catalog) {
    const providerId = await ensureOracleProvider(pool, game.provider, game.provider);
    if (!providerId) {
      skipped += 1;
      continue;
    }

    const [existing] = await pool.query(
      `SELECT id, is_hot, is_featured, is_live, is_active
       FROM games
       WHERE provider_id = ? AND code = ?
       LIMIT 1`,
      [providerId, game.code],
    );

    if (existing.length) {
      await pool.query(
        `UPDATE games
         SET name = ?, category = ?, game_type = ?, image_url = COALESCE(?, image_url),
             is_live = GREATEST(is_live, ?), status = 'active', is_active = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          game.name,
          game.category,
          game.gameType,
          game.imageUrl,
          game.isLive ? 1 : 0,
          existing[0].id,
        ],
      );
      updated += 1;
    } else {
      await pool.query(
        `INSERT INTO games
          (provider_id, code, name, category, game_type, image_url, min_bet, status, is_hot, is_featured, is_live, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 10.00, 'active', 0, 0, ?, 1, 0)`,
        [
          providerId,
          game.code,
          game.name,
          game.category,
          game.gameType,
          game.imageUrl,
          game.isLive ? 1 : 0,
        ],
      );
      inserted += 1;
    }
  }

  const [[{ hotCount }]] = await pool.query(`SELECT COUNT(*) AS hotCount FROM games WHERE is_hot = 1`);
  if (Number(hotCount) === 0) {
    const [hotCandidates] = await pool.query(
      `SELECT id FROM games WHERE is_active = 1 ORDER BY id DESC LIMIT 48`,
    );
    if (hotCandidates.length) {
      const ids = hotCandidates.map((row) => row.id);
      await pool.query(
        `UPDATE games SET is_hot = 1 WHERE id IN (${ids.map(() => '?').join(', ')})`,
        ids,
      );
    }
  }

  return { inserted, updated, skipped, total: catalog.length, backup };
}

export async function listAdminHotGames() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT g.*, p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.is_hot = 1
     ORDER BY g.sort_order ASC, g.name ASC`,
  );

  return { data: rows.map(mapGameRow) };
}

export async function searchAdminGames(query = '', limit = 30) {
  const pool = getPool();
  const q = String(query || '').trim();
  if (!q) {
    return { data: [] };
  }

  const term = `%${q}%`;
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));

  const [rows] = await pool.query(
    `SELECT g.*, p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.name LIKE ? OR g.code LIKE ? OR p.name LIKE ? OR p.code LIKE ?
     ORDER BY g.is_hot DESC, g.name ASC
     LIMIT ?`,
    [term, term, term, term, safeLimit],
  );

  return { data: rows.map(mapGameRow) };
}

export async function addAdminHotGame(gameId) {
  const pool = getPool();
  const row = await fetchGameRowById(pool, gameId);

  if (!row) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  if (row.is_hot === 1 || row.is_hot === true) {
    const error = new Error('Game is already in hot list');
    error.statusCode = 409;
    throw error;
  }

  const [[{ maxOrder }]] = await pool.query(
    `SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM games WHERE is_hot = 1`,
  );
  const nextOrder = Number(maxOrder) + 1;

  await pool.query(
    `UPDATE games SET is_hot = 1, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [nextOrder, gameId],
  );

  const updated = await fetchGameRowById(pool, gameId);
  return { data: mapGameRow(updated), message: 'Game added to hot list' };
}

export async function reorderAdminHotGames(gameIds = []) {
  const pool = getPool();
  const ids = (Array.isArray(gameIds) ? gameIds : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!ids.length) {
    return listAdminHotGames();
  }

  const [rows] = await pool.query(
    `SELECT id FROM games WHERE is_hot = 1 AND id IN (${ids.map(() => '?').join(', ')})`,
    ids,
  );

  if (rows.length !== ids.length) {
    const error = new Error('Invalid hot game order list');
    error.statusCode = 400;
    throw error;
  }

  for (let index = 0; index < ids.length; index += 1) {
    await pool.query(
      `UPDATE games SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [index + 1, ids[index]],
    );
  }

  return listAdminHotGames();
}

export async function removeAdminHotGame(gameId) {
  const pool = getPool();
  const row = await fetchGameRowById(pool, gameId);

  if (!row) {
    const error = new Error('Game not found');
    error.statusCode = 404;
    throw error;
  }

  if (row.is_hot !== 1 && row.is_hot !== true) {
    const error = new Error('Game is not in hot list');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `UPDATE games SET is_hot = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [gameId],
  );

  const updated = await fetchGameRowById(pool, gameId);
  return { data: mapGameRow(updated), message: 'Game removed from hot list' };
}

function buildSiteGameFilters({ category, provider, search }) {
  const conditions = [
    'g.is_active = 1',
    'g.status = \'active\'',
    '(p.enabled = 1 OR p.enabled IS NULL)',
    'p.status = \'active\'',
  ];
  const params = [];

  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  if (hiddenProviders.length) {
    conditions.push(`p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`);
    params.push(...hiddenProviders);
  }

  if (category === 'hot') {
    conditions.push('g.is_hot = 1');
  } else if (category === 'featured') {
    conditions.push('g.is_featured = 1');
  } else if (category === 'live') {
    conditions.push('g.is_live = 1');
  } else if (category && category !== 'all') {
    if (category === 'slots' || category === 'slot') {
      conditions.push('g.category IN (?, ?)');
      params.push('slots', 'slot');
    } else if (category === 'fishing' || category === 'fish') {
      conditions.push('g.category IN (?, ?)');
      params.push('fishing', 'fish');
    } else if (category === 'casino') {
      conditions.push('g.category IN (?, ?)');
      params.push('casino', 'casino live');
    } else {
      conditions.push('g.category = ?');
      params.push(category);
    }
  }

  if (provider) {
    conditions.push('(p.code = ? OR p.name = ?)');
    params.push(provider, provider);
  }

  const searchTerm = String(search || '').trim().replace(/[%_]/g, '');
  if (searchTerm) {
    const like = `%${searchTerm}%`;
    conditions.push('(g.name LIKE ? OR p.name LIKE ? OR p.code LIKE ?)');
    params.push(like, like, like);
  }

  return { whereClause: conditions.join(' AND '), params };
}

export async function listHotPublicGames({ page = 1, limit = 48 } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 48));
  const offset = (safePage - 1) * safeLimit;

  const whereClause = [
    'g.is_hot = 1',
    'g.is_active = 1',
    'g.status = \'active\'',
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
  );

  return {
    gatewayActive,
    gamesEnabled: gatewayActive,
    message: gatewayActive ? undefined : 'Games are temporarily unavailable',
    data: rows.map(mapSiteGameRow),
  };
}

export async function listSiteGames({ category = 'hot', provider = '', search = '', page = 1, limit = 48 } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  if (!gatewayActive) {
    return {
      gatewayActive: false,
      gamesEnabled: false,
      message: 'Games are temporarily unavailable',
      data: [],
    };
  }

  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 48));
  const offset = (safePage - 1) * safeLimit;

  const effectiveCategory = search ? (category || 'all') : category;
  const { whereClause, params } = buildSiteGameFilters({ category: effectiveCategory, provider, search });

  const [rows] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.image_url, g.custom_image_url, g.provider_id, g.is_hot, g.is_featured, g.is_live,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.sort_order ASC, g.name ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return { gatewayActive: true, gamesEnabled: true, data: rows.map(mapSiteGameRow) };
}

export async function listSiteProviders({ category = '' } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  if (!gatewayActive) {
    return {
      gatewayActive: false,
      gamesEnabled: false,
      message: 'Games are temporarily unavailable',
      data: [],
    };
  }

  const pool = getPool();
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (normalizedCategory && normalizedCategory !== 'hot' && normalizedCategory !== 'all') {
    let categoryPrimary = normalizedCategory === 'slot' ? 'slots' : normalizedCategory;
    let categorySecondary = categoryPrimary;
    if (normalizedCategory === 'slots' || normalizedCategory === 'slot') {
      categoryPrimary = 'slots';
      categorySecondary = 'slot';
    } else if (normalizedCategory === 'fishing' || normalizedCategory === 'fish') {
      categoryPrimary = 'fishing';
      categorySecondary = 'fish';
    } else if (normalizedCategory === 'casino') {
      categoryPrimary = 'casino';
      categorySecondary = 'casino live';
    }
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
        categoryPrimary,
        categorySecondary,
        ...[...HIDDEN_SITE_PROVIDER_CODES],
      ],
    );

    return {
      gatewayActive: true,
      gamesEnabled: true,
      data: rows.map((row) => ({
        id: row.code,
        code: row.code,
        name: formatProviderDisplayName(row.name, row.sample_game_name),
        logo: resolvePublicProviderLogo({
          ...row,
          provider_logo: row.provider_logo || row.sample_image,
        }),
      })),
    };
  }

  const [rows] = await pool.query(
    `SELECT id, code, name, provider_logo
     FROM providers
     WHERE enabled = 1 AND status = 'active'
     ORDER BY name ASC`,
  );

  return {
    gatewayActive: true,
    gamesEnabled: true,
    data: rows.map((row) => ({
      id: row.code,
      code: row.code,
      name: row.name,
      logo: resolvePublicProviderLogo(row),
    })),
  };
}

const DEFAULT_PROVIDER_LOGO = '/images/providers/default.svg';

const PROVIDER_LOGO_ALIASES = {
  horsebook: 'horse',
  spadegaming: 'sg',
  'pg soft': 'pg',
  pgsoft: 'pg',
  'pragmatic play': 'pp',
  'evolution gaming': 'evolution',
  'sexy gaming': 'sexy',
  'ka gaming': 'ka',
  'cq9 gaming': 'cq9',
  hbrds: 'jili',
  habanero: 'jili',
  saba: 'sportsbook',
  sbtech: 'sportsbook',
  luckysports: 'cmd',
  sbos: 'sbo',
  ws: 'sportsbook',
  tbc: 'default',
  'saba sports': 'sportsbook',
  'sbo sports': 'sbo',
  'lucky sports': 'cmd',
  'ws sports': 'sportsbook',
  '9w': '9w',
  '9wicket': '9w',
  '9wicket sports': '9w',
};

function formatProviderDisplayName(providerName, sampleGameName = '') {
  const provider = String(providerName || '').trim();
  const sample = String(sampleGameName || '').trim();
  if (/^9\s*wicket$/i.test(provider) || provider.toUpperCase() === '9W') {
    return sample || '9WICKET SPORTS';
  }
  if (sample && /sports/i.test(sample) && provider.length <= 6) {
    return sample.replace(/\s+SPORTS$/i, ' Sports').replace(/\s+/g, ' ').trim();
  }
  return provider;
}

export function resolvePublicProviderLogo(provider) {
  const customLogo = String(provider?.provider_logo || provider?.sample_image || '').trim();
  if (customLogo && !customLogo.endsWith('default.svg')) {
    if (customLogo.startsWith('http://') || customLogo.startsWith('https://')) {
      if (!customLogo.endsWith('/') && !/\/thumbnail\/9W\/?$/i.test(customLogo)) {
        return customLogo;
      }
    } else if (customLogo.endsWith('.png')) {
      return customLogo.replace(/\.png$/i, '.svg');
    } else {
      return customLogo;
    }
  }

  const rawCode = String(provider?.code || provider?.provider_code || provider?.name || '')
    .trim()
    .toLowerCase();
  const code = PROVIDER_LOGO_ALIASES[rawCode]
    || rawCode.replace(/[^a-z0-9-]/g, '');

  if (code) {
    return `/images/providers/${code}.svg`;
  }

  return DEFAULT_PROVIDER_LOGO;
}

export async function listPublicGameProviders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.id, p.code, p.name, p.provider_logo,
            MIN(COALESCE(g.sort_order, 9999)) AS sort_rank
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.status = 'active'
       AND COALESCE(g.is_active, 1) = 1
       AND p.status = 'active'
       AND COALESCE(p.enabled, 1) = 1
     GROUP BY p.id, p.code, p.name, p.provider_logo
     ORDER BY sort_rank ASC, p.name ASC`,
  );

  return rows.map((row, index) => ({
    provider_name: row.name,
    provider_logo: resolvePublicProviderLogo(row),
    display_order: index + 1,
  }));
}

export default {
  migrateGameCatalogSchema,
  listAdminGames,
  listAdminProviders,
  updateGameFlags,
  bulkUpdateGameFlags,
  toggleGameField,
  bulkToggleGames,
  toggleProviderEnabled,
  syncProvidersFromExternal,
  syncProvidersFromOracle,
  removeDummyOracleGames,
  syncGamesFromOracle,
  listAdminHotGames,
  searchAdminGames,
  addAdminHotGame,
  removeAdminHotGame,
  listHotPublicGames,
  listSiteGames,
  listSiteProviders,
  listPublicGameProviders,
  resolvePublicProviderLogo,
};
