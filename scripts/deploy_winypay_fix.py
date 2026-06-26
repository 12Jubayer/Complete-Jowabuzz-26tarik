#!/usr/bin/env python3
import sys, time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HOST, USER, PASSWORD = '103.168.173.101', 'root', 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
FILES = [
    'backend/services/paymentGatewayConfig.js',
    'backend/controllers/userProfileController.js',
    'frontend/src/pages/profile/ProfileDepositPage.jsx',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()
_, o, _ = c.exec_command(f'cd {REMOTE}/frontend && npm run build', timeout=600)
print(o.read().decode('utf-8', errors='replace')[-800:])
c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
time.sleep(3)
_, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/health', timeout=15)
print('health:', o.read().decode())
c.close()
print('DONE')
