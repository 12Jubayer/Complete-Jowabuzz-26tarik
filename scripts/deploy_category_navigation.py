import paramiko
import time
from pathlib import Path

HOST, USER, PASSWORD = '103.168.173.101', 'root', 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')

FILES = [
    'frontend/src/services/providerCacheService.js',
    'frontend/src/services/gameService.js',
    'frontend/src/services/providerService.js',
    'frontend/src/utils/categoryNavigation.js',
    'frontend/src/components/ProviderGrid.jsx',
    'frontend/src/components/ProviderGridSkeleton.jsx',
    'frontend/src/components/GameGridSkeleton.jsx',
    'frontend/src/components/CategoryNavBar.jsx',
    'frontend/src/components/GameCategoryNavigator.jsx',
    'frontend/src/components/GameGrid.jsx',
    'frontend/src/pages/HomePage.jsx',
    'frontend/src/index.css',
]


def ensure_dir(sftp, path):
    try:
        sftp.stat(path)
    except OSError:
        parts = path.replace(REMOTE + '/', '').split('/')
        cur = REMOTE
        for part in parts:
            cur = f'{cur}/{part}'
            try:
                sftp.stat(cur)
            except OSError:
                sftp.mkdir(cur)


def run(client, cmd, timeout=300):
    print('$', cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-2000:])
    if err.strip() and code != 0:
        print(err[-2000:])
    return code


c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    local = ROOT / rel
    remote = f'{REMOTE}/{rel}'
    ensure_dir(sftp, remote.rsplit('/', 1)[0])
    sftp.put(str(local), remote)
    print('uploaded', rel)
sftp.close()

code = run(c, f'cd {REMOTE}/frontend && npm run build', timeout=600)
if code != 0:
    raise SystemExit(code)
run(c, 'pm2 restart jowabuzz --update-env')
time.sleep(4)
run(c, 'curl -s "http://127.0.0.1:3001/api/site/providers" | head -c 200')
run(c, 'curl -s "http://127.0.0.1:3001/api/site/games?category=sports&limit=3" | head -c 300')
c.close()
print('DONE')
