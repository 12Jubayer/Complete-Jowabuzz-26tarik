import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

# syntax check + simulate duplicate launch
script = r'''
cd /www/wwwroot/jowabuzz/backend && node --check controllers/gameController.js && node <<'NODE'
import 'dotenv/config';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const [[user]] = await pool.query("SELECT id FROM users WHERE id=38 LIMIT 1");
const secret = process.env.JWT_SECRET || process.env.USER_JWT_SECRET;
const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '1h' });
const body = JSON.stringify({ gameId: 9663, providerId: 3216 });
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
};

async function startOnce(label) {
  const res = await fetch('http://127.0.0.1:3001/api/game/start', {
    method: 'POST', headers, body,
  });
  const data = await res.json();
  console.log(label, res.status, data.launchUrl?.slice(0, 90), data.error || 'ok');
  return data;
}

const [a, b] = await Promise.all([startOnce('A'), startOnce('B')]);
console.log('same_url', a.launchUrl && a.launchUrl === b.launchUrl);
await pool.end();
NODE
'''

_, o, e = c.exec_command(script, timeout=120)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err:
    print('ERR', err[:2000])

c.close()
