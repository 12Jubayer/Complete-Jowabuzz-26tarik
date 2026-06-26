import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/gameWalletService.js',
    'backend/services/hmkApiService.js',
    'backend/services/softapiService.js',
    'backend/controllers/gameController.js',
    'backend/controllers/hmkController.js',
    'backend/controllers/softapiController.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:500])
time.sleep(2)
_, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/hmk/health', timeout=20)
print('health:', o.read().decode('utf-8', errors='replace')[:300])
c.close()
print('DONE')
