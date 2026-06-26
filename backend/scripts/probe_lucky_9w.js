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
  return { uid: gameUid, ok: body?.code === 0, url: (body?.data?.url || '').slice(0, 120), msg: (body?.msg || '').slice(0, 60) };
}

// Find 9wicket and lucky sports in DB
const [nine] = await pool.query(
  `SELECT g.id,g.code,g.name,p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.name LIKE '%9wicket%' OR g.name LIKE '%9 wicket%' OR p.code LIKE '%9W%' OR g.code LIKE '%9W%' LIMIT 10`,
);
console.log('9WICKET_ROWS', JSON.stringify(nine));

const [[lucky]] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name LIKE '%LUCKY SPORT%' LIMIT 3`,
);
console.log('LUCKY', JSON.stringify(lucky));

const luckyUids = ['3217', '0', 'LUCKYSPORTS', 'luckysports', 'LUCKY', 'OG', 'Money_Frog'];
if (lucky) {
  luckyUids.push(lucky.code, String(lucky.id));
}
for (const uid of [...new Set(luckyUids)]) {
  console.log('HMK', JSON.stringify(await tryHmk(uid)));
}

// Oracle launch for comparison
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
if (lucky && user) {
  try {
    const r = await launchOracleGameSession({ user, game: lucky, sessionToken: 't', launchBalance: 100 });
    console.log('ORACLE_OK', (r.launchUrl || '').slice(0, 150));
  } catch (e) {
    console.log('ORACLE_FAIL', e.message?.slice(0, 100));
  }
}

process.exit(0);
