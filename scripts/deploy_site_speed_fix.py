import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'frontend/vite.config.js',
    'frontend/src/App.jsx',
    'frontend/src/routes/deferredPages.js',
    'frontend/src/components/RouteLoadingFallback.jsx',
    'frontend/src/components/HomeRouteEntry.jsx',
    'frontend/src/services/gameService.js',
    'backend/server.js',
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
_, o, _ = c.exec_command(f'cd {REMOTE}/frontend && npm run build 2>&1', timeout=600)
out = o.read().decode('utf-8', errors='replace')
print(out[-2500:])
code = o.channel.recv_exit_status()
if code != 0:
    raise SystemExit(code)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:400])
time.sleep(3)
_, o, _ = c.exec_command('ls -lh /www/wwwroot/jowabuzz/frontend/dist/assets/*.js | head -10', timeout=20)
print(o.read().decode('utf-8', errors='replace'))
c.close()
print('DONE')
