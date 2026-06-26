import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase } from '../config/db.js';
import { runScheduledAgentCommissionSettlement } from './agentSettlementCron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

loadEnv(path.join(__dirname, '..', '.env'));
await connectDatabase();
const result = await runScheduledAgentCommissionSettlement(new Date());
console.log(JSON.stringify(result));
