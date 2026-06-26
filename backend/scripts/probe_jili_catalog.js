import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode } from '../services/oracleGamingApiService.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const jili = await getProviderByCode(settings, 'JILI');
console.log('games count', (jili.games || []).length);
console.log('raw type', typeof jili.raw, Array.isArray(jili.raw));
console.log('raw keys', jili.raw && !Array.isArray(jili.raw) ? Object.keys(jili.raw) : 'array');
console.log('sample games', JSON.stringify((jili.games || []).slice(0, 5), null, 2));
const names = (jili.games || []).filter((g) => /super|ace|zodiac|aviator|twist/i.test(g.name)).slice(0, 15);
console.log('matches', JSON.stringify(names, null, 2));

// try JILIS provider code directly
try {
  const jilis = await getProviderByCode(settings, 'JILIS');
  console.log('JILIS games count', (jilis.games || []).length);
  const m2 = (jilis.games || []).filter((g) => /super|ace|542/i.test(JSON.stringify(g))).slice(0, 10);
  console.log('JILIS matches', JSON.stringify(m2, null, 2));
} catch (e) {
  console.log('JILIS err', e.message);
}

process.exit(0);
