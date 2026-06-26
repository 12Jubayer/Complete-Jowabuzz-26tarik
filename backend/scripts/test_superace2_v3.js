import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { launchOracleGame } from '../services/oracleGamesApiClient.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const uid = '77f407b50f00ec4569249b008a5adca0';
const body = {
  username: 'dhouxdiyhr',
  user_id: 20,
  money: 100,
  game_code: '542',
  game_uid: uid,
  game_name: 'Super Ace 2',
  provider_code: 'JILIS',
  game_type: 'SLOT',
  operator_id: settings.operatorId,
  callback_url: 'https://jowabuzz.com/api/oracle/callback',
};
try {
  const launch = await launchOracleGame(settings, body);
  console.log('RESULT', JSON.stringify({ success: launch.success, url: (launch.gameUrl || launch.launchUrl || '').slice(0, 150), msg: launch.message }));
} catch (e) {
  console.log('ERR', e.message);
}
process.exit(0);
