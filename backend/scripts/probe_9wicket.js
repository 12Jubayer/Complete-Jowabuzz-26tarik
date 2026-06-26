import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode, resolveGameUidForLaunch } from '../services/oracleGamingApiService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const settings = await getGamingGatewaySettingsInternal();
const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryHmk(gameUid) {
  const payload = {
    user_id: '1', balance: 100, game_uid: String(gameUid), token, timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
    callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
    currency_code: 'BDT', language: 'en',
  };
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  const url = body?.data?.url || '';
  return { uid: gameUid, ok: body?.code === 0, url: url.slice(0, 120), msg: (body?.msg || '').slice(0, 60) };
}

const [prov] = await pool.query(`SELECT * FROM providers WHERE code='9W'`);
console.log('PROVIDER', JSON.stringify(prov));

const [games] = await pool.query(
  `SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='9W' OR g.name LIKE '%9 wicket%' OR g.name LIKE '%9wicket%'`,
);
console.log('GAMES', JSON.stringify(games));

try {
  const cat = await getProviderByCode(settings, '9W');
  const sample = (cat.games || []).slice(0, 8);
  console.log('ORACLE_CAT count', (cat.games||[]).length, JSON.stringify(sample));
} catch (e) {
  console.log('ORACLE_CAT_FAIL', e.message);
}

for (const g of games) {
  const hex = await resolveGameUidForLaunch(settings, { providerCode: g.provider_code || '9W', gameCode: g.code, gameName: g.name });
  const tries = [g.code, String(g.id), hex, '9W', '9WICKET', '9wicket'].filter(Boolean);
  for (const uid of [...new Set(tries)]) {
    const r = await tryHmk(uid);
    if (r.ok || /9w|wicket/i.test(r.url)) console.log(g.name, JSON.stringify(r));
  }
}

// brute nearby ids if provider has id
if (games[0]?.id) {
  for (const id of [games[0].id - 1, games[0].id, games[0].id + 1, 2779]) {
    console.log('ID_TRY', JSON.stringify(await tryHmk(id)));
  }
}

process.exit(0);
