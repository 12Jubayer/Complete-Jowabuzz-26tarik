import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

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
  const url = body?.data?.url || '';
  return { uid: gameUid, ok: body?.code === 0, url: url.slice(0, 100), hasUni247: url.includes('uni247'), has9w: /9w|wicket/i.test(url) };
}

// search 9wicket
const [w] = await pool.query(
  `SELECT g.id,g.code,g.name,p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.name LIKE '%wicket%' OR p.code='9W' OR p.name LIKE '%9W%' OR g.name LIKE '%9W%' LIMIT 20`,
);
console.log('WICKET', JSON.stringify(w));

// brute ids near 3217 and oracle hex as uid
const candidates = [
  '92b24e4c25107367a80e0fe1a97c24e4',
  '3216','3218','3215','4630','4631','4633',
];
for (const uid of candidates) {
  const r = await tryHmk(uid);
  if (r.ok) console.log(JSON.stringify(r));
}

// all sports - check which open uni247 vs wrong
const [sports] = await pool.query(
  `SELECT g.id,g.code,g.name,p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.category='sports' AND g.status='active'`,
);
for (const row of sports) {
  const r = await tryHmk(row.id);
  console.log(row.name, row.provider, r.hasUni247 ? 'UNI247' : 'OTHER', r.url.slice(0, 70));
}
process.exit(0);
