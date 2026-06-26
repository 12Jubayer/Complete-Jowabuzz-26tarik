import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const [[g]] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.id=5121`,
);
try {
  const r = await launchGameSession({
    provider: { code: g.provider_code, adapter_key: g.adapter_key },
    user,
    game: g,
    sessionToken: 't',
    launchBalance: 100,
  });
  console.log('OK', g.name, r.launchUrl);
} catch (err) {
  console.log('FAIL', g.name, err.message);
}
process.exit(0);
