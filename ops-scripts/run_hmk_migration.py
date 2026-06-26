import paramiko
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
LOCAL = Path(r'c:\Users\ASUS\Downloads\zip\scripts\migrate_oracle_to_hmk_catalog.js')
REMOTE = '/www/wwwroot/jowabuzz/backend/scripts/migrate_oracle_to_hmk_catalog.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
sftp.put(str(LOCAL), REMOTE)
sftp.close()
print('uploaded migration script')

_, o, e = c.exec_command(
    'cd /www/wwwroot/jowabuzz/backend && node scripts/migrate_oracle_to_hmk_catalog.js 2>&1',
    timeout=900000,
)
out = o.read().decode('utf-8', 'replace')
err = e.read().decode('utf-8', 'replace')
print(out[-8000:] if len(out) > 8000 else out)
if err.strip():
    print('ERR', err[:500])

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', 'replace')[:200])

_, o, _ = c.exec_command(
    "curl -s 'http://127.0.0.1:3001/api/site/providers?category=sports' | head -c 600",
    timeout=30,
)
print('sports:', o.read().decode('utf-8', 'replace'))
c.close()
