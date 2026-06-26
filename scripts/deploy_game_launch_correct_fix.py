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
    'backend/services/gamingGatewayService.js',
    'backend/controllers/gameController.js',
    'backend/server.js',
    'backend/scripts/verify_launch_fix.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()

_, o, _ = c.exec_command(
    "grep -q '^HMK_LAUNCH_ALL_GAMES=' /www/wwwroot/jowabuzz/backend/.env "
    "&& sed -i 's/^HMK_LAUNCH_ALL_GAMES=.*/HMK_LAUNCH_ALL_GAMES=false/' /www/wwwroot/jowabuzz/backend/.env "
    "|| echo 'HMK_LAUNCH_ALL_GAMES=false' >> /www/wwwroot/jowabuzz/backend/.env",
    timeout=20,
)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:400])
time.sleep(3)

_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node scripts/verify_launch_fix.js', timeout=300000)
print(o.read().decode('utf-8', errors='replace'))
err = e.read().decode('utf-8', errors='replace')
if err.strip():
    print('ERR:', err[:500])
c.close()
print('DONE')
