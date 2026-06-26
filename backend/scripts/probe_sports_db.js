import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryLaunch(gameUid) {
  const payload = {
    user_id: '1', balance: 100, game_uid: String(gameUid), token, timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
    callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
    currency_code: process.env.HMK_CURRENCY || 'BDT', language: 'en',
  };
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { uid: gameUid, code: body?.code, msg: (body?.msg || '').slice(0, 60), ok: body?.code === 0 };
}

const [rows] = await pool.query(
  `SELECT g.id, g.code, g.name, p.code AS provider
   FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.category='sports' AND g.status='active' AND g.is_active=1`,
);
for (const row of rows) {
  const tries = [row.code, row.provider, String(row.id), `${row.provider}_0`, `${row.provider}:0`];
  for (const uid of [...new Set(tries)]) {
    const r = await tryLaunch(uid);
    if (r.ok) console.log('SUCCESS', row.name, row.provider, JSON.stringify(r));
    else console.log('FAIL', row.name, uid, r.msg);
  }
}
process.exit(0);
