import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command("grep -E '^DB_|^MYSQL_' /www/wwwroot/jowabuzz/backend/.env | head -10", timeout=30)
print(o.read().decode('utf-8','replace'))

# run as pm2 process env
probe = r"""
cd /www/wwwroot/jowabuzz/backend && node -e "
import 'dotenv/config';
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
});
const [[g]] = await pool.query('SELECT COUNT(*) c FROM games');
const [[pr]] = await pool.query('SELECT COUNT(*) c FROM providers');
const [[o]] = await pool.query(\"SELECT COUNT(*) c FROM providers WHERE adapter_key='oracle'\");
const [[og]] = await pool.query(\"SELECT COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.adapter_key='oracle'\");
const [sample] = await pool.query(\"SELECT p.code,p.adapter_key,COUNT(*) cnt FROM games g JOIN providers p ON p.id=g.provider_id GROUP BY p.id ORDER BY cnt DESC LIMIT 15\");
console.log(JSON.stringify({games:g.c,providers:pr.c,oracleProviders:o.c,oracleGames:og.c,topProviders:sample}));
await pool.end();
"
"""
_, o, e = c.exec_command(probe, timeout=60000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:400])
c.close()
