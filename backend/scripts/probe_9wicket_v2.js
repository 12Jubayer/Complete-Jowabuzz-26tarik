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
  const url = body?.data?.url || '';
  return {
    uid: gameUid,
    code: body?.code,
    ok: body?.code === 0 && !!url,
    url: url.slice(0, 140),
    msg: (body?.msg || '').slice(0, 80),
  };
}

const [[game]] = await pool.query(
  `SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='9W' LIMIT 1`,
);

const uids = [
  '9W',
  '9w',
  '9WICKET',
  '9wicket',
  '48341a3bf62b6dd0814d7129e7e0834b',
  String(game?.id || ''),
  '0',
  '2779',
  '6020',
].filter(Boolean);

console.log('GAME', JSON.stringify({ id: game?.id, code: game?.code, name: game?.name }));

for (const uid of [...new Set(uids)]) {
  const r = await tryHmk(uid);
  console.log(JSON.stringify(r));
  if (r.ok) break;
}

process.exit(0);
