import fs from 'fs';
import { connectDatabase } from './config/db.js';
import { buildCommissionSegments, calculateDateWiseCommission } from './services/affiliateCommissionPeriodService.js';

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv('.env');
await connectDatabase();
console.log('segments start');
const segments = await buildCommissionSegments('2026-06-06', '2026-06-06');
console.log('segments', segments);
console.log('calc start');
const comm = await calculateDateWiseCommission(1, '2026-06-06', '2026-06-06');
console.log('comm', comm);
