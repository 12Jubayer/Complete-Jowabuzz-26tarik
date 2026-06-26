import paramiko
import json
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

# Test launch via internal API (needs a test user token - use launch endpoint probe)
probe = r"""
cd /www/wwwroot/jowabuzz/backend && node -e "
import('dotenv/config');
import { connectDatabase } from './config/db.js';
import { launchGameViaHmk } from './services/hmkApiService.js';
await connectDatabase();
const pool = (await import('./config/db.js')).getPool();
const [[game]] = await pool.query(\"SELECT g.*, p.code as provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='9W' AND g.category='sports' LIMIT 1\");
console.log('GAME', JSON.stringify({id:game?.id, name:game?.name, code:game?.code, provider:game?.provider_code}));
try {
  const r = await launchGameViaHmk({ game, userId: 1, username: 'testuser', currency: 'BDT' });
  console.log('LAUNCH_OK', JSON.stringify(r).slice(0,500));
} catch(e) {
  console.log('LAUNCH_ERR', e.message);
}
process.exit(0);
"
"""
_, o, e = c.exec_command(probe, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:600])
c.close()
