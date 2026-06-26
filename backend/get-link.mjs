import { connectDatabase } from './config/db.js';
import { buildMoveCashDownloadUrl, getActiveMoveCashLink } from './services/movecashLinkService.js';

await connectDatabase();
const link = await getActiveMoveCashLink();
if (!link) {
  console.log('NO_ACTIVE_TOKEN');
  process.exit(0);
}
console.log('DOWNLOAD_URL=' + buildMoveCashDownloadUrl(link.token));
console.log('AGENT_LOGIN=https://jowabuzz.com/agent/login');
console.log('EXPIRES_AT=' + (link.expiresAt || 'none'));
