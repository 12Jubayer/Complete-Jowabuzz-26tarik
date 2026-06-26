import paramiko
from pathlib import Path
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = '/www/wwwroot/jowabuzz/backend/services/hmkApiService.js'
LOCAL = Path(r'c:\Users\ASUS\Downloads\zip\scripts\hmkApiService_patch_snippet.txt')

snippet = """function isHmkLaunchUid(value) {
  const code = trim(value);
  if (!code || code === '0') return false;
  if (isOracleOnlyUid(code)) {
    return (
      trim(process.env.HMK_PRIMARY_PROVIDER).toLowerCase() === 'true'
      || trim(process.env.ORACLE_DISABLED).toLowerCase() === 'true'
    );
  }
  return true;
}"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

# download, patch locally, upload
sftp = c.open_sftp()
with sftp.open(REMOTE, 'r') as f:
    text = f.read().decode('utf-8').replace('\r\n', '\n')

old = """function isHmkLaunchUid(value) {
  const code = trim(value);
  if (!code || code === '0' || isOracleOnlyUid(code)) return false;
  return true;
}"""

if old not in text:
    print('OLD_BLOCK_NOT_FOUND')
    # show context
    idx = text.find('function isHmkLaunchUid')
    print(text[idx:idx+200] if idx>=0 else 'NOT FOUND')
else:
    text = text.replace(old, snippet, 1)
    with sftp.open(REMOTE, 'w') as f:
        f.write(text.encode('utf-8'))
    print('PATCH_OK')

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8','replace')[:120])

_, o, _ = c.exec_command(r'''cd /www/wwwroot/jowabuzz/backend && node -e "
import('dotenv/config');
import { connectDatabase } from './config/db.js';
import { launchHmkGameSession } from './services/hmkApiService.js';
await connectDatabase();
const pool=(await import('./config/db.js')).getPool();
const [[g]]=await pool.query(\"SELECT g.*,p.code provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name='Fortune Tiger' AND p.code='PG' LIMIT 1\");
const r=await launchHmkGameSession({user:{id:1},game:g,sessionToken:'t',launchBalance:100});
console.log('OK', r.launchUrl.slice(0,90));
"''', timeout=60000)
print(o.read().decode('utf-8','replace'))
_, o, e = c.exec_command('', timeout=1)
c.close()
