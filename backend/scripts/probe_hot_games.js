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
  return { code: body?.code, msg: (body?.msg || '').slice(0, 50) };
}

const [rows] = await pool.query(
  `SELECT g.id, g.code, g.name, p.code AS provider
   FROM games g JOIN providers p ON p.id = g.provider_id
   WHERE g.is_hot = 1 AND g.status = 'active'
   ORDER BY g.sort_order, g.id LIMIT 25`,
);

for (const row of rows) {
  const byCode = await tryLaunch(row.code);
  const byId = await tryLaunch(row.id);
  const winner = byCode.code === 0 ? 'CODE' : byId.code === 0 ? 'ID' : 'NONE';
  console.log(
    JSON.stringify({
      name: row.name,
      provider: row.provider,
      code: row.code,
      id: row.id,
      winner,
      codeResult: byCode,
      idResult: byId,
    }),
  );
}

process.exit(0);
