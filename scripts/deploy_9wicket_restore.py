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
    'backend/scripts/seed_9wicket_sports.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()

_, o, e = c.exec_command(f'cd {REMOTE}/backend && node scripts/seed_9wicket_sports.js', timeout=60000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR', err[:400])

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:300])
time.sleep(2)

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=sports'", timeout=30)
print('sports providers:', o.read().decode('utf-8', 'replace')[:1200])
c.close()
print('DONE')
