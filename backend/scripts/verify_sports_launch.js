import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';
import { shouldUseHmkForAllGames } from '../services/hmkApiService.js';

await connectDatabase();
console.log('routeViaHmk', shouldUseHmkForAllGames());
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const [rows] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.category='sports' AND g.status='active' LIMIT 6`,
);
for (const g of rows) {
  try {
    const r = await launchGameSession({
      provider: { code: g.provider_code, adapter_key: g.adapter_key },
      user, game: g, sessionToken: 'v', launchBalance: 100,
    });
    console.log('OK', g.name, (r.launchUrl || '').slice(0, 80));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 80));
  }
}
process.exit(0);
