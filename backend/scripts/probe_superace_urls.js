import 'dotenv/config';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryLaunch(extra = {}) {
  const gameUid = String(extra.game_uid ?? extra.gameUid ?? '');
  const payload = {
    user_id: '1',
    balance: 100,
    game_uid: gameUid,
    token,
    timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
    callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
    currency_code: process.env.HMK_CURRENCY || 'BDT',
    language: 'en',
    ...extra,
  };
  delete payload.gameUid;
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { gameUid, code: body?.code, msg: (body?.msg || '').slice(0, 70), url: (body?.data?.url || '').slice(0, 100) };
}

const tests = [
  { game_uid: '542' },
  { game_uid: '5121' },
  { game_uid: '541' },
  { game_uid: '543' },
  { game_uid: '49' },
  { game_uid: '5120' },
  { game_uid: '542', provider_code: 'JILIS' },
  { game_uid: '542', provider: 'JILIS' },
  { game_uid: '542', provider_code: 'JILI' },
  { game_uid: 'JILIS:542' },
  { game_uid: 'JILIS_542' },
  { game_uid: '57_542' },
];

for (const t of tests) {
  console.log(JSON.stringify(await tryLaunch(t)));
}

process.exit(0);
