import 'dotenv/config';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

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
  return { uid: gameUid, code: body?.code, msg: (body?.msg || '').slice(0, 70), ok: body?.code === 0 };
}

const uids = ['LUCKYSPORTS', 'SABA', 'SBOS', 'SBO', 'TBC', '2BC', 'WS', '0', 'LUCKY SPORTS', 'SABA SPORTS'];
for (const uid of uids) {
  const r = await tryLaunch(uid);
  console.log(JSON.stringify(r));
}
process.exit(0);
