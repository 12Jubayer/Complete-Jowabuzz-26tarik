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
    'backend/services/gameCatalogService.js',
    'backend/controllers/gameController.js',
    'backend/controllers/hmkController.js',
    'backend/controllers/softapiController.js',
    'frontend/src/utils/providerLogo.js',
    'frontend/src/components/ProviderLogoImage.jsx',
    'frontend/src/components/ProviderGrid.jsx',
    'frontend/src/services/gameService.js',
    'frontend/src/services/providerService.js',
    'frontend/src/data/publicGameProviders.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

for rel in FILES:
    local = ROOT / rel
    remote = f'{REMOTE}/{rel}'
    parts = remote.rsplit('/', 1)[0]
    try:
        sftp.stat(parts)
    except OSError:
        cur = REMOTE
        for part in parts.replace(REMOTE + '/', '').split('/'):
            cur = f'{cur}/{part}'
            try:
                sftp.stat(cur)
            except OSError:
                sftp.mkdir(cur)
    sftp.put(str(local), remote)
    print('uploaded', rel)

sftp.close()
_, o, _ = c.exec_command(f'cd {REMOTE}/frontend && npm run build 2>&1 | tail -6', timeout=600)
print(o.read().decode('utf-8', errors='replace'))
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:400])
time.sleep(3)
_, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/hmk/health', timeout=20)
print('health:', o.read().decode('utf-8', errors='replace')[:300])
c.close()
print('DONE')
