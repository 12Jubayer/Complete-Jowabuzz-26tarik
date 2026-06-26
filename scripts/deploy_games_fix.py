import paramiko, time
from pathlib import Path

HOST, USER, PASSWORD = '103.168.173.101', 'root', 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
FILES = [
    'backend/services/hmkApiService.js',
    'backend/services/gameCatalogService.js',
    'backend/services/gamingProviderService.js',
    'backend/controllers/gameController.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()
c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
time.sleep(4)
_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/public/games/hot?limit=5"', timeout=20)
print('hot games:', o.read().decode('utf-8', errors='replace')[:500])
_, o, _ = c.exec_command('curl -s "http://127.0.0.1:3001/api/site/games?category=hot&limit=5"', timeout=20)
print('site games:', o.read().decode('utf-8', errors='replace')[:500])
c.close()
print('DONE')
