import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

probe = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { buildHmkLaunchQuery } from './services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
import { getProviderByCode } from './services/oracleGamingApiService.js';
import { connectDatabase } from './config/db.js';

await connectDatabase();
const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, port: Number(process.env.DB_PORT || 3306),
});
const base = (process.env.HMK_API_URL || '').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryHmk(uid) {
  const payload = { user_id: '1', balance: 100, game_uid: String(uid), token, timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL, callback: process.env.HMK_CALLBACK_URL,
    currency_code: process.env.HMK_CURRENCY || 'BDT', language: 'en' };
  const q = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${q}`);
  const body = await res.json();
  return { uid, ok: body?.code === 0, msg: (body?.msg||'').slice(0,70), code: body?.code };
}

const names = ['Fortune Tiger', 'Fortune Ox', 'Dragon Hatch', 'Cocktail Nights'];
const [rows] = await pool.query(
  `SELECT g.id,g.code,g.name,p.code pc FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE p.code IN ('PG','PGS','PGSOFT') AND g.name IN (${names.map(()=>'?').join(',')})`, names);
console.log('DB_PG', JSON.stringify(rows));

const settings = await getGamingGatewaySettingsInternal();
const cat = await getProviderByCode(settings, 'PG');
const samples = (cat.games||[]).filter(g => names.some(n => (g.name||'').includes(n.split(' ')[0]))).slice(0,6);
console.log('ORACLE_PG', JSON.stringify(samples.map(g => ({name:g.name, code:g.code, legacy:g.legacyCode, uid:g.gameUid}))));

for (const g of (cat.games||[]).slice(0,5)) {
  const tries = [g.legacyCode, g.code, g.gameUid].filter(Boolean);
  for (const uid of [...new Set(tries)]) {
    const r = await tryHmk(uid);
    if (r.ok || !/invalid/i.test(r.msg)) console.log('TRY', g.name?.slice(0,20), JSON.stringify(r));
  }
}

// try numeric PG patterns
for (const uid of ['126', '98', '57', '74', '87', 'PG', 'pg-fortune-tiger']) {
  console.log('NUM', JSON.stringify(await tryHmk(uid)));
}
await pool.end();
NODE
'''
_, o, e = c.exec_command(probe, timeout=180000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:600])
c.close()
