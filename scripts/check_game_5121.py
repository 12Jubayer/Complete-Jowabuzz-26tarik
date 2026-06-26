import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -E '^DB_' /www/wwwroot/jowabuzz/backend/.env | head -6",
    """cd /www/wwwroot/jowabuzz/backend && node -e "
import 'dotenv/config';
import { connectDatabase } from './config/db.js';
await connectDatabase();
const pool = (await import('./config/db.js')).getPool();
const [rows] = await pool.query('SELECT g.id,g.code,g.name,p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.id IN (5121,838,9) OR g.name LIKE \\\"%Boxing%\\\" OR g.name LIKE \\\"%Zodiac%\\\" LIMIT 10');
console.log(JSON.stringify(rows,null,2));
process.exit(0);
" """,
]

for cmd in cmds:
    print('=== CMD ===')
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip():
        print('ERR:', err[:500])
c.close()
