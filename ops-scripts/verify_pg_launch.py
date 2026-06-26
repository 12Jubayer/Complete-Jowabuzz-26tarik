import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command(r'''cd /www/wwwroot/jowabuzz/backend && node -e "
import('dotenv/config');
import { connectDatabase } from './config/db.js';
import { launchHmkGameSession } from './services/hmkApiService.js';
await connectDatabase();
const pool=(await import('./config/db.js')).getPool();
for (const name of ['Fortune Tiger','Fortune Ox','Dragon Hatch']) {
  const [[g]]=await pool.query(\"SELECT g.*,p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name=? AND p.code='PG' LIMIT 1\",[name]);
  try {
    const r=await launchHmkGameSession({user:{id:1},game:g,sessionToken:'t',launchBalance:100});
    console.log(name,'OK',r.launchUrl.slice(0,70));
  } catch(err) { console.log(name,'FAIL',err.message); }
}
" 2>&1''', timeout=90000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:300])
c.close()
