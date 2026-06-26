import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const [sports] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.category='sports' AND g.status='active'`,
);
for (const g of sports) {
  try {
    const r = await launchGameSession({
      provider: { code: g.provider_code, adapter_key: g.adapter_key },
      user, game: g, sessionToken: 'v', launchBalance: 100,
    });
    const url = r.launchUrl || '';
    console.log(g.name, url.includes('uni247') ? 'LUCKY_OK' : url.includes('sportsbook') ? 'SBO_OK' : 'OTHER', url.slice(0, 90));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 80));
  }
}
const [hidden] = await pool.query("SELECT code,name,enabled,status FROM providers WHERE code='9W'");
console.log('9W', JSON.stringify(hidden));
process.exit(0);
