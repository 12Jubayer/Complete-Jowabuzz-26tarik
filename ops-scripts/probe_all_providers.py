import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

script = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { buildHmkLaunchQuery } from './services/hmkCryptoService.js';
import { launchHmkGameSession } from './services/hmkApiService.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const base = process.env.HMK_API_URL.replace(/\/$/, '');
const token = process.env.HMK_TOKEN, secret = process.env.HMK_SECRET;

async function directHmk(uid) {
  const p = { user_id:'1', balance:100, game_uid:String(uid), token, timestamp:Date.now(),
    return:process.env.HMK_RETURN_URL, callback:process.env.HMK_CALLBACK_URL, currency_code:'BDT', language:'en' };
  const b = await (await fetch(`${base}?${buildHmkLaunchQuery(p,secret,token)}`)).json();
  return { code: b?.code, msg: (b?.msg||'').slice(0,60), ok: b?.code===0 };
}

const probes = [
  { pc: 'PG', name: 'Fortune Tiger' },
  { pc: 'SPRIBE', name: 'Aviator' },
  { pc: 'JILI', name: 'Boxing King' },
  { pc: 'PP', name: 'Sweet Bonanza' },
  { pc: 'EVOASIA', name: 'Crazy Time' },
  { pc: 'JILIS', name: null },
];

for (const q of probes) {
  const sql = q.name
    ? `SELECT g.*,p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code=? AND g.name LIKE ? LIMIT 1`
    : `SELECT g.*,p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code=? LIMIT 1`;
  const params = q.name ? [q.pc, `%${q.name}%`] : [q.pc];
  const [[g]] = await pool.query(sql, params);
  if (!g) { console.log('MISSING', q.pc, q.name); continue; }
  console.log('---', q.pc, g.name, 'code', g.code?.slice(0,36), 'len', g.code?.length);
  const d = await directHmk(g.code);
  console.log('  direct', JSON.stringify(d));
  try {
    const r = await launchHmkGameSession({ user:{id:1}, game:g, sessionToken:'t', launchBalance:100 });
    console.log('  service OK', r.launchUrl?.slice(0,70));
  } catch (e) {
    console.log('  service FAIL', e.message);
  }
}
await pool.end();
NODE
'''
_, o, e = c.exec_command(script, timeout=300000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:800])
c.close()
