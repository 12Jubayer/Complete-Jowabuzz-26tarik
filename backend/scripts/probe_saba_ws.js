import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode, resolveGameUidForLaunch } from '../services/oracleGamingApiService.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

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
  return { ok: body?.code === 0, url: (body?.data?.url || '').slice(0, 100) };
}

for (const prov of ['SABA', 'WS', '9W', 'LUCKSPORT']) {
  try {
    const r = await getProviderByCode(settings, prov);
    const sports = (r.games || []).filter((g) => /sport|exchange|0/i.test(JSON.stringify(g))).slice(0, 5);
    console.log('PROV', prov, 'count', (r.games||[]).length, JSON.stringify(sports));
  } catch (e) {
    console.log('PROV_FAIL', prov, e.message);
  }
}

const [[saba]] = await pool.query(
  `SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name='SABA SPORTS'`,
);
const [[ws]] = await pool.query(
  `SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name='WS SPORTS'`,
);

for (const g of [saba, ws].filter(Boolean)) {
  const hex = await resolveGameUidForLaunch(settings, { providerCode: g.provider_code, gameCode: g.code, gameName: g.name });
  console.log(g.name, 'hex', hex);
  if (hex) console.log('  HMK', await tryHmk(hex));
}

const [p9] = await pool.query(`SELECT * FROM providers WHERE code LIKE '%9W%' OR name LIKE '%9W%' OR name LIKE '%wicket%'`);
console.log('PROVIDERS_9W', JSON.stringify(p9));
process.exit(0);
