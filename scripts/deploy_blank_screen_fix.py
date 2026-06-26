import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sftp = c.open_sftp()
sftp.put(
    str(ROOT / 'frontend/src/components/GameGrid.jsx'),
    f'{REMOTE}/frontend/src/components/GameGrid.jsx',
)
print('uploaded GameGrid.jsx')
sftp.close()

_, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -8', timeout=600)
out = o.read().decode('utf-8', errors='replace')
print(out)
code = o.channel.recv_exit_status()
print('build exit:', code)

if code == 0:
    _, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
    print(o.read().decode('utf-8', errors='replace')[:400])
    time.sleep(3)
    _, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/health', timeout=20)
    print('health:', o.read().decode('utf-8', errors='replace'))

c.close()
print('DONE')
