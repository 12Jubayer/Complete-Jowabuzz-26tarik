import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchHmkGameSession } from '../services/hmkApiService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();

const [[game]] = await pool.query(
  `SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code
   FROM games g JOIN providers p ON p.id = g.provider_id
   WHERE g.id = 5121 LIMIT 1`,
);
const [[user]] = await pool.query('SELECT id, name, phone, balance, status FROM users WHERE status = ? ORDER BY id ASC LIMIT 1', ['active']);
if (!user) {
  console.log('No active user found');
  process.exit(1);
}

const tests = [5121, 5556, 380, 838, 8];
for (const gameId of tests) {
  const [[g]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code
     FROM games g JOIN providers p ON p.id = g.provider_id WHERE g.id = ? LIMIT 1`,
    [gameId],
  );
  if (!g) continue;
  try {
    const result = await launchHmkGameSession({
      user: { id: user.id, name: user.name, phone: user.phone, balance: user.balance },
      game: g,
      sessionToken: 'test',
      launchBalance: 100,
    });
    console.log('OK', g.name, '->', result.launchUrl?.slice(0, 80));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 80));
  }
}

process.exit(0);
