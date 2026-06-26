import paramiko, json
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

const [[user]] = await pool.query("SELECT id, name, phone, balance, status FROM users WHERE status='active' ORDER BY id LIMIT 1");
const [[game]] = await pool.query(`
  SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code, p.adapter_key
  FROM games g JOIN providers p ON p.id=g.provider_id
  WHERE p.code='SPRIBE' AND (g.name LIKE '%Aviator%' OR g.code LIKE '%aviator%')
  AND g.is_active=1 LIMIT 1`);

console.log('game', game);
const token1 = 'test_' + Date.now();
const r1 = await launchHmkGameSession({ user, game, sessionToken: token1, launchBalance: user.balance });
console.log('launch1', r1.launchUrl?.slice(0, 200));

// second launch same user immediately
const token2 = 'test_' + (Date.now()+1);
const r2 = await launchHmkGameSession({ user, game, sessionToken: token2, launchBalance: user.balance });
console.log('launch2', r2.launchUrl?.slice(0, 200));
console.log('same_url', r1.launchUrl === r2.launchUrl);

await pool.end();
NODE
'''

_, o, e = c.exec_command(script, timeout=120)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:2000])
c.close()
