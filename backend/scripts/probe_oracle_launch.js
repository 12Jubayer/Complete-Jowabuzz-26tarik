import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal, launchOracleGameSession } from '../services/gamingGatewayService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query(
  "SELECT id, name, phone, provider_username, balance, status FROM users WHERE status='active' ORDER BY id LIMIT 1",
);

const gameIds = [5121, 838, 5556, 380];
for (const gameId of gameIds) {
  const [[g]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code, p.adapter_key
     FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.id = ? LIMIT 1`,
    [gameId],
  );
  try {
    const settings = await getGamingGatewaySettingsInternal();
    if (settings.providerStatus !== 'active') {
      console.log(g.name, 'gateway inactive');
      continue;
    }
    const result = await launchOracleGameSession({
      user,
      game: g,
      sessionToken: 'test',
      launchBalance: 100,
    });
    console.log('ORACLE_OK', g.name, (result.launchUrl || result.gameUrl || '').slice(0, 100));
  } catch (e) {
    console.log('ORACLE_FAIL', g.name, e.message?.slice(0, 80));
  }
}

process.exit(0);
