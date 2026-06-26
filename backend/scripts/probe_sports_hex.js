import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { resolveGameUidForLaunch } from '../services/oracleGamingApiService.js';

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
  return { ok: body?.code === 0, url: url.slice(0, 110), msg: (body?.msg || '').slice(0, 50) };
}

const [sports] = await pool.query(
  `SELECT g.id,g.code,g.name,p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.category='sports' AND g.status='active'`,
);

for (const g of sports) {
  let hex = null;
  try {
    hex = await resolveGameUidForLaunch(settings, {
      providerCode: g.provider_code,
      gameCode: g.code,
      gameName: g.name,
    });
  } catch (e) {
    hex = null;
  }
  const byId = await tryHmk(g.id);
  const byHex = hex ? await tryHmk(hex) : { ok: false, url: '', msg: 'no hex' };
  console.log(JSON.stringify({
    name: g.name,
    provider: g.provider_code,
    id: g.id,
    hex,
    idOk: byId.ok,
    idUrl: byId.url,
    hexOk: byHex.ok,
    hexUrl: byHex.url,
  }));
}
process.exit(0);
