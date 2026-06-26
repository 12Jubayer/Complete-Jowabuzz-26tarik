import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode, resolveGameUidForLaunch } from '../services/oracleGamingApiService.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const settings = await getGamingGatewaySettingsInternal();

const [[game]] = await pool.query(
  `SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='9W' LIMIT 1`,
);

// Oracle catalog
try {
  const cat = await getProviderByCode(settings, '9W');
  console.log('ORACLE_PROVIDER', JSON.stringify({ code: cat?.code, name: cat?.name, games: (cat?.games || []).slice(0, 5) }));
  for (const g of (cat?.games || []).slice(0, 10)) {
    const hex = await resolveGameUidForLaunch(settings, { providerCode: '9W', gameCode: g.code, gameName: g.name });
    console.log('ORACLE_GAME', JSON.stringify({ code: g.code, name: g.name, uid: g.uid || g.game_uid, hex }));
  }
} catch (e) {
  console.log('ORACLE_CAT_ERR', e.message);
}

// Oracle launch test
try {
  const { launchOracleGameSession } = await import('../services/gamingGatewayService.js');
  const r = await launchOracleGameSession({
    user: { id: 1, username: 'test' },
    game: { ...game, provider_code: '9W' },
    launchBalance: 100,
  });
  console.log('ORACLE_LAUNCH', JSON.stringify(r).slice(0, 300));
} catch (e) {
  console.log('ORACLE_LAUNCH_ERR', e.message);
}

process.exit(0);
