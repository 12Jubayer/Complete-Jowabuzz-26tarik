/**
 * One-time server migration: remove Oracle catalog from DB, import HMK-ready catalog.
 * Run on production only: node scripts/migrate_oracle_to_hmk_catalog.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { connectDatabase } from '../config/db.js';
import { getAllProviders, getProviderByCode } from '../services/oracleGamingApiService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '../backups');

const HMK_SPORTS_SEED = [
  { code: 'LUCKYSPORTS', name: 'LUCKYSPORTS', gameName: 'Lucky Sports', gameCode: '92b24e4c25107367a80e0fe1a97c24e4' },
  { code: 'SABA', name: 'SABA Sports', gameName: 'SABA Sports', gameCode: '0' },
  { code: 'SBOS', name: 'SBO Sports', gameName: 'SBO Sports', gameCode: '07baf9e1388d32cd4cee0c0c91b23020' },
  { code: 'TBC', name: '2BC Sports', gameName: '2BC Sports', gameCode: 'TBC' },
  { code: 'WS', name: 'WS Sports', gameName: 'WS Sports', gameCode: 'WS' },
  { code: '9W', name: '9Wicket', gameName: '9WICKET SPORTS', gameCode: '48341a3bf62b6dd0814d7129e7e0834b', image: '/images/providers/9w.svg' },
];

const SPORTS_HEX = {
  LUCKYSPORTS: '92b24e4c25107367a80e0fe1a97c24e4',
  SABA: null,
  SBOS: '07baf9e1388d32cd4cee0c0c91b23020',
  TBC: 'TBC',
  WS: 'WS',
  '9W': '48341a3bf62b6dd0814d7129e7e0834b',
};

function trim(v) {
  return String(v ?? '').trim();
}

function isHex(v) {
  return /^[a-f0-9]{32}$/i.test(trim(v));
}

function resolveHmkGameCode(game = {}) {
  const legacy = trim(game.legacyCode);
  const uid = trim(game.gameUid || '');
  const catalogCode = trim(game.code || '');
  const gameType = trim(game.gameType || '').toUpperCase();
  const category = trim(game.category || '').toLowerCase();
  const isSports = category === 'sports' || gameType === 'SPORTS';

  if (isSports) {
    if (isHex(uid)) return uid;
    if (isHex(catalogCode)) return catalogCode;
    if (legacy && legacy !== '0') return legacy;
    return uid || catalogCode;
  }

  if (legacy && legacy !== '0' && !isHex(legacy)) return legacy;
  if (catalogCode && catalogCode !== '0' && !isHex(catalogCode)) return catalogCode;
  if (uid && !isHex(uid) && uid !== '0') return uid;
  if (isHex(uid)) return uid;
  return legacy || catalogCode || uid;
}

function mapCategory(gameType = '', category = '') {
  const gt = trim(gameType).toUpperCase();
  const cat = trim(category).toLowerCase();
  if (cat) return cat;
  if (gt === 'SPORTS') return 'sports';
  if (['LIVE', 'CASINO', 'TABLE'].includes(gt)) return 'casino';
  if (gt === 'CRASH' || gt === 'MINI') return 'crash';
  if (gt === 'FISH' || gt === 'FISHING') return 'fish';
  return 'slot';
}

async function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    connectionLimit: 4,
  });
}

async function backupTables(pool) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(BACKUP_DIR, `pre-hmk-migration-${stamp}.json`);
  const [providers] = await pool.query('SELECT * FROM providers');
  const [games] = await pool.query('SELECT * FROM games');
  const [hot] = await pool.query(
    `SELECT g.name, g.code, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.is_hot=1`,
  );
  fs.writeFileSync(out, JSON.stringify({ backedUpAt: new Date().toISOString(), providers, games, hotGames: hot }, null, 0));
  console.log('BACKUP', out, 'providers', providers.length, 'games', games.length, 'hot', hot.length);
  return { out, hotGames: hot };
}

async function clearCatalog(pool) {
  await pool.query('SET FOREIGN_KEY_CHECKS=0');
  await pool.query('DELETE FROM game_rounds');
  await pool.query('DELETE FROM game_sessions');
  await pool.query('DELETE FROM games');
  await pool.query('DELETE FROM providers');
  await pool.query('SET FOREIGN_KEY_CHECKS=1');
  console.log('CLEARED games + providers');
}

async function ensureProvider(pool, code, name) {
  const c = trim(code).toUpperCase();
  const [result] = await pool.query(
    `INSERT INTO providers (code, name, adapter_key, status, enabled)
     VALUES (?, ?, 'hmk', 'active', 1)
     ON DUPLICATE KEY UPDATE name=VALUES(name), adapter_key='hmk', status='active', enabled=1`,
    [c, name || c],
  );
  const [[row]] = await pool.query('SELECT id FROM providers WHERE code=? LIMIT 1', [c]);
  return row?.id || result.insertId;
}

async function upsertGame(pool, row) {
  await pool.query(
    `INSERT INTO games (provider_id, code, name, category, game_type, image_url, min_bet, status, is_hot, is_featured, is_live, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 10.00, 'active', ?, 0, ?, 1, 0)
     ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), game_type=VALUES(game_type),
       image_url=COALESCE(VALUES(image_url), image_url), status='active', is_active=1`,
    [
      row.providerId,
      row.code,
      row.name,
      row.category,
      row.gameType,
      row.imageUrl,
      row.isHot ? 1 : 0,
      row.isLive ? 1 : 0,
    ],
  );
}

async function fetchCatalog(settings) {
  const providers = await getAllProviders(settings);
  console.log('ORACLE_API providers', providers.length);
  const games = [];
  const seen = new Set();
  let idx = 0;
  for (const provider of providers) {
    idx += 1;
    try {
      const result = await getProviderByCode(settings, provider.code);
      for (const game of result.games || []) {
        const hmkCode = resolveHmkGameCode(game);
        if (!hmkCode) continue;
        const key = `${provider.code}:${hmkCode}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        games.push({
          providerCode: provider.code,
          providerName: result.provider?.name || provider.name || provider.code,
          code: hmkCode,
          name: game.name,
          category: mapCategory(game.gameType, game.category),
          gameType: game.gameType || 'SLOT',
          imageUrl: game.imageUrl || null,
          isLive: game.isLive ? 1 : 0,
        });
      }
      if (idx % 10 === 0) console.log('FETCHED', idx, '/', providers.length, 'games', games.length);
    } catch (e) {
      console.warn('SKIP_PROVIDER', provider.code, e.message);
    }
  }
  return games;
}

async function seedSports(pool) {
  for (const s of HMK_SPORTS_SEED) {
    const providerId = await ensureProvider(pool, s.code, s.name);
    const code = SPORTS_HEX[s.code] || s.gameCode;
    await upsertGame(pool, {
      providerId,
      code,
      name: s.gameName,
      category: 'sports',
      gameType: 'SPORTS',
      imageUrl: s.image || null,
      isHot: 0,
      isLive: 0,
    });
  }
  console.log('SPORTS_SEEDED', HMK_SPORTS_SEED.length);
}

async function restoreHot(pool, hotGames = []) {
  let restored = 0;
  for (const h of hotGames) {
    const [r] = await pool.query(
      `UPDATE games g JOIN providers p ON p.id=g.provider_id
       SET g.is_hot=1
       WHERE p.code=? AND (g.name=? OR g.code=?)`,
      [h.provider_code, h.name, h.code],
    );
    restored += r.affectedRows || 0;
  }
  if (restored < 12) {
    await pool.query(`UPDATE games SET is_hot=1 ORDER BY id ASC LIMIT 48`);
  }
  console.log('HOT_RESTORED', restored);
}

async function main() {
  await connectDatabase();
  const pool = await createPool();
  const settings = await getGamingGatewaySettingsInternal();
  const { hotGames } = await backupTables(pool);
  const catalog = await fetchCatalog(settings);
  console.log('CATALOG_GAMES', catalog.length);
  if (!catalog.length) {
    console.error('NO_CATALOG_ABORT');
    await pool.end();
    process.exit(1);
  }

  await clearCatalog(pool);

  const providerIds = new Map();
  for (const g of catalog) {
    if (!providerIds.has(g.providerCode)) {
      const id = await ensureProvider(pool, g.providerCode, g.providerName);
      providerIds.set(g.providerCode, id);
    }
  }
  console.log('PROVIDERS_INSERTED', providerIds.size);

  let inserted = 0;
  for (const g of catalog) {
    await upsertGame(pool, {
      providerId: providerIds.get(g.providerCode),
      code: g.code,
      name: g.name,
      category: g.category,
      gameType: g.gameType,
      imageUrl: g.imageUrl,
      isHot: 0,
      isLive: g.isLive,
    });
    inserted += 1;
    if (inserted % 500 === 0) console.log('INSERTED', inserted);
  }

  await seedSports(pool);
  await restoreHot(pool, hotGames);

  const [[counts]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM providers) AS providers, (SELECT COUNT(*) FROM games) AS games,
            (SELECT COUNT(*) FROM providers WHERE adapter_key='oracle') AS oracle_left`,
  );
  console.log('DONE', JSON.stringify(counts));
  await pool.end();
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
