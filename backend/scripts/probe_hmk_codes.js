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
  return body;
}

const candidates = [
  '542', '541', '543', '540', '77', '5121',
  'SuperAce2', 'superace2', 'SUPERACE2',
  'JILI542', 'JILIS542', 'jili_542',
];

// hot games from screenshot
const hotCodes = ['77', '0', 'SG12Zodiacs', '160245', '22065', '3978'];
for (const c of hotCodes) candidates.push(c);

const seen = new Set();
for (const uid of candidates) {
  if (seen.has(uid)) continue;
  seen.add(uid);
  const body = await tryLaunch(uid);
  console.log(uid, body.code, (body.msg || '').slice(0, 80));
}

process.exit(0);
