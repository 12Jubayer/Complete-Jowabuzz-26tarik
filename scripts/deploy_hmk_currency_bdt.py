import paramiko
import re
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'
ENV_PATH = f'{REMOTE}/backend/.env'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sftp = c.open_sftp()
sftp.put(
    str(ROOT / 'backend/services/hmkApiService.js'),
    f'{REMOTE}/backend/services/hmkApiService.js',
)
print('uploaded hmkApiService.js')

with sftp.open(ENV_PATH, 'r') as f:
    env_text = f.read().decode('utf-8', errors='replace')

if re.search(r'^HMK_CURRENCY=', env_text, re.M):
    patched = re.sub(r'^HMK_CURRENCY=.*$', 'HMK_CURRENCY=BDT', env_text, flags=re.M)
else:
    patched = env_text.rstrip() + '\nHMK_CURRENCY=BDT\n'

if patched != env_text:
    with sftp.open(ENV_PATH, 'w') as f:
        f.write(patched)
    print('updated HMK_CURRENCY=BDT in .env')
else:
    print('HMK_CURRENCY already BDT')

sftp.close()

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:500])
time.sleep(4)

_, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/hmk/health', timeout=20)
health = o.read().decode('utf-8', errors='replace')
print('hmk health:', health[:400])

c.close()
print('DONE')
