import fs from 'fs';

const envPath = '/www/wwwroot/jowabuzz/backend/.env';
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const { connectDatabase } = await import('/www/wwwroot/jowabuzz/backend/config/db.js');
const { runScheduledAffiliateSettlement } = await import(
  new URL('./affiliateSettlementCron.js', import.meta.url).href
);

await connectDatabase();
const result = await runScheduledAffiliateSettlement(new Date());
console.log(JSON.stringify(result));
