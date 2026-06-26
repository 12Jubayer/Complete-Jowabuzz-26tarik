import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode } from '../services/oracleGamingApiService.js';

await connectDatabase();

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryLaunch(gameUid) {
  const payload = {
    user_id: '1',
    balance: 100,
    game_uid: String(gameUid),
    token,
    timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
    callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
    currency_code: process.env.HMK_CURRENCY || 'BDT',
    language: 'en',
  };
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { gameUid, code: body?.code, msg: body?.msg };
}

const settings = await getGamingGatewaySettingsInternal();
const jili = await getProviderByCode(settings, 'JILI');
const boxingNorm = (jili.games || []).find((g) => /boxing king/i.test(g.name));
console.log('BOXING_NORM', JSON.stringify(boxingNorm));

const rawGames = Array.isArray(jili.raw) ? jili.raw : (jili.raw?.games || jili.raw?.data || []);
const boxingRaw = (Array.isArray(rawGames) ? rawGames : []).find((g) =>
  /boxing king/i.test(String(g.game_name || g.gameName || g.name || '')),
);
console.log('BOXING_RAW', JSON.stringify(boxingRaw));

const tests = new Set(['77', '838', '3978', '394']);
if (boxingNorm) {
  Object.entries(boxingNorm).forEach(([k, v]) => {
    if (v && String(v).length < 40) tests.add(String(v));
  });
}
if (boxingRaw) {
  Object.entries(boxingRaw).forEach(([k, v]) => {
    if (v !== null && v !== undefined && String(v).length < 40) tests.add(String(v));
  });
}

for (const uid of tests) {
  const result = await tryLaunch(uid);
  if (result.code === 0) console.log('SUCCESS', JSON.stringify(result));
  else console.log('FAIL', JSON.stringify(result));
}

const pool = (await import('../config/db.js')).getPool();
const [rows] = await pool.query(
  `SELECT g.id, g.code, g.name, p.code AS provider_code
   FROM games g JOIN providers p ON p.id = g.provider_id
   WHERE g.is_hot = 1 AND g.status = 'active' LIMIT 5`,
);
for (const row of rows) {
  const byId = await tryLaunch(row.id);
  const byCode = await tryLaunch(row.code);
  console.log('DB_GAME', row.name, 'id=', byId.code, byId.msg?.slice(0, 40), 'code=', byCode.code, byCode.msg?.slice(0, 40));
}

process.exit(0);
