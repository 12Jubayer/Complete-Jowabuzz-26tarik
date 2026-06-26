import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query(
  "SELECT id, name, phone, balance, status FROM users WHERE status='active' ORDER BY id LIMIT 1",
);

const ids = [5121, 838, 5556, 380, 5120];
for (const gameId of ids) {
  const [[g]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code, p.adapter_key
     FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.id = ? LIMIT 1`,
    [gameId],
  );
  try {
    const result = await launchGameSession({
      provider: { code: g.provider_code, adapter_key: g.adapter_key },
      user,
      game: g,
      sessionToken: 'verify',
      launchBalance: 100,
    });
    const url = result.launchUrl || '';
    let hint = '';
    if (url.includes('gameID=77') || url.includes('gameMode=twist') || url.includes('spribe') || url.includes('542')) {
      hint = 'LIKELY_CORRECT';
    }
    console.log('OK', g.name, hint, url.slice(0, 110));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 90));
  }
}

process.exit(0);
