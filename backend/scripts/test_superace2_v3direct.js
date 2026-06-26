import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { launchOracleV3Game } from '../services/oracleGamesV3ApiClient.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const uid = '77f407b50f00ec4569249b008a5adca0';
const r = await launchOracleV3Game(settings, {
  username: 'dhouxdiyhr',
  game_uid: uid,
  amount: '100',
});
console.log(JSON.stringify({ success: r.success, msg: r.message, url: (r.gameUrl || '').slice(0, 150) }));
process.exit(0);
