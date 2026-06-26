import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal, launchOracleGameSession } from '../services/gamingGatewayService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
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
  return { uid: gameUid, code: body?.code, msg: body?.msg, url: (body?.data?.url || '').slice(0, 100) };
}

const uids = ['48341a3bf62b6dd0814d7129e7e0834b', '9W', '9WICKET', '9wicket', '0', '2779'];
for (const u of uids) console.log('HMK', JSON.stringify(await tryHmk(u)));

const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const game = {
  id: 99999,
  code: '48341a3bf62b6dd0814d7129e7e0834b',
  name: '9Wicket',
  category: 'sports',
  game_type: 'SPORTS',
  provider_code: '9W',
  adapter_key: 'oracle',
};
try {
  const r = await launchOracleGameSession({ user, game, sessionToken: 't', launchBalance: 100 });
  console.log('ORACLE', (r.launchUrl || '').slice(0, 150));
} catch (e) {
  console.log('ORACLE_FAIL', e.message);
}
process.exit(0);
