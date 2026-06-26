import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -A12 'function isHmkLaunchUid' /www/wwwroot/jowabuzz/backend/services/hmkApiService.js | head -14", timeout=30)
print(o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command(r'''cd /www/wwwroot/jowabuzz/backend && node -e "
import('dotenv/config');
import mysql from 'mysql2/promise';
import { launchHmkGameSession } from './services/hmkApiService.js';
const pool=mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
const [[g]]=await pool.query(\"SELECT g.*,p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name='Fortune Tiger' AND p.code='PG' LIMIT 1\");
const r=await launchHmkGameSession({user:{id:1},game:g,sessionToken:'t',launchBalance:100});
console.log('OK',r.launchUrl.slice(0,90));
await pool.end();
" 2>&1''', timeout=60000)
print(o.read().decode('utf-8','replace'))
c.close()
