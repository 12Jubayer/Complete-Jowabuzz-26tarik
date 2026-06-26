import { connectDatabase } from './config/db.js';
import { getAppDownloadSetting } from './services/appDownloadService.js';

await connectDatabase();
const setting = await getAppDownloadSetting();
console.log(JSON.stringify(setting, null, 2));
process.exit(0);
