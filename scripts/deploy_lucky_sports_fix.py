import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/hmkApiService.js',
    'backend/services/gameCatalogService.js',
]

verify = """import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const [sports] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.category='sports' AND g.status='active'`,
);
for (const g of sports) {
  try {
    const r = await launchGameSession({
      provider: { code: g.provider_code, adapter_key: g.adapter_key },
      user, game: g, sessionToken: 'v', launchBalance: 100,
    });
    const url = r.launchUrl || '';
    console.log(g.name, url.includes('uni247') ? 'LUCKY_OK' : url.includes('sportsbook') ? 'SBO_OK' : 'OTHER', url.slice(0, 90));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 80));
  }
}
const [hidden] = await pool.query("SELECT code,name,enabled,status FROM providers WHERE code='9W'");
console.log('9W', JSON.stringify(hidden));
process.exit(0);
"""
(ROOT / 'backend/scripts/verify_lucky_fix.js').write_text(verify, encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in FILES + ['backend/scripts/verify_lucky_fix.js']:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()

sql = """
UPDATE providers SET enabled=0, status='inactive' WHERE code IN ('9W');
UPDATE games g JOIN providers p ON p.id=g.provider_id SET g.is_active=0, g.status='inactive' WHERE p.code='9W';
"""
_, o, _ = c.exec_command(
    f"mysql -u root -p$(grep ^DB_PASSWORD= {REMOTE}/backend/.env | cut -d= -f2) jowabuzz -e \"{sql}\"",
    timeout=30,
)
print('sql:', o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:300])
time.sleep(3)

_, o, _ = c.exec_command(f'cd {REMOTE}/backend && node scripts/verify_lucky_fix.js 2>&1', timeout=300000)
print('--- VERIFY ---')
print(o.read().decode('utf-8', errors='replace'))
c.close()
print('DONE')
