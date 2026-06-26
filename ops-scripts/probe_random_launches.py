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
import { launchHmkGameSession } from './services/hmkApiService.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});

const [rows] = await pool.query(`
  SELECT g.*, p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id
  WHERE g.category IN ('slot','crash','casino','fish')
  ORDER BY RAND() LIMIT 25
`);

let ok=0, fail=0;
for (const g of rows) {
  try {
    await launchHmkGameSession({ user:{id:99}, game:g, sessionToken:'t', launchBalance:100 });
    ok++;
  } catch(e) {
    fail++;
    if (fail <= 8) console.log('FAIL', g.provider_code, g.name?.slice(0,25), g.code?.slice(0,20), e.message.slice(0,50));
  }
}
console.log('SUMMARY', { tested: rows.length, ok, fail });
await pool.end();
NODE
'''
_, o, _ = c.exec_command(script, timeout=300000)
print(o.read().decode('utf-8','replace'))
c.close()
