import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/hmkApiService.js',
    'backend/services/gamingProviderService.js',
    'backend/services/gameCatalogService.js',
    'backend/server.js',
    'backend/scripts/verify_sports_launch.js',
]

# verify script
verify = """import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { launchGameSession } from '../services/gamingProviderService.js';
import { shouldUseHmkForAllGames } from '../services/hmkApiService.js';

await connectDatabase();
console.log('routeViaHmk', shouldUseHmkForAllGames());
const pool = (await import('../config/db.js')).getPool();
const [[user]] = await pool.query("SELECT id,name,phone,balance FROM users WHERE status='active' LIMIT 1");
const [rows] = await pool.query(
  `SELECT g.id,g.code,g.name,g.category,g.game_type,p.code AS provider_code,p.adapter_key
   FROM games g JOIN providers p ON p.id=g.provider_id
   WHERE g.category='sports' AND g.status='active' LIMIT 6`,
);
for (const g of rows) {
  try {
    const r = await launchGameSession({
      provider: { code: g.provider_code, adapter_key: g.adapter_key },
      user, game: g, sessionToken: 'v', launchBalance: 100,
    });
    console.log('OK', g.name, (r.launchUrl || '').slice(0, 80));
  } catch (e) {
    console.log('FAIL', g.name, e.message?.slice(0, 80));
  }
}
process.exit(0);
"""
(ROOT / 'backend/scripts/verify_sports_launch.js').write_text(verify, encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()

env_cmds = [
    "sed -i '/^HMK_LAUNCH_ALL_GAMES=false/d' /www/wwwroot/jowabuzz/backend/.env",
    "grep -q '^HMK_PRIMARY_PROVIDER=' /www/wwwroot/jowabuzz/backend/.env || echo 'HMK_PRIMARY_PROVIDER=true' >> /www/wwwroot/jowabuzz/backend/.env",
    "sed -i 's/^HMK_PRIMARY_PROVIDER=.*/HMK_PRIMARY_PROVIDER=true/' /www/wwwroot/jowabuzz/backend/.env",
    "grep -q '^ORACLE_DISABLED=' /www/wwwroot/jowabuzz/backend/.env || echo 'ORACLE_DISABLED=true' >> /www/wwwroot/jowabuzz/backend/.env",
    "sed -i 's/^ORACLE_DISABLED=.*/ORACLE_DISABLED=true/' /www/wwwroot/jowabuzz/backend/.env",
]
for cmd in env_cmds:
    c.exec_command(cmd, timeout=20)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:400])
time.sleep(3)

_, o, _ = c.exec_command(f'cd {REMOTE}/backend && node scripts/verify_sports_launch.js 2>&1', timeout=300000)
print('--- VERIFY ---')
print(o.read().decode('utf-8', errors='replace'))
c.close()
print('DONE')
