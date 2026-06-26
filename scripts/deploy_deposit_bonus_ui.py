#!/usr/bin/env python3
import paramiko
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

root = Path(__file__).resolve().parent.parent
remote = '/www/wwwroot/jowabuzz'
files = [
    'backend/services/depositBonusService.js',
    'backend/controllers/userProfileController.js',
    'frontend/src/pages/profile/ProfileDepositPage.jsx',
]

for rel in files:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
    sftp = client.open_sftp()
    sftp.put(str(root / rel), f'{remote}/{rel}')
    sftp.close()
    client.close()
    print('uploaded', rel)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = f'''
set -e
cd "{remote}/frontend" && npm install && npm run build
pm2 restart jowabuzz
sleep 4
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/site/active-deposit-bonus | head -c 300
echo
'''
_, stdout, stderr = client.exec_command(cmd, timeout=600000)
out = stdout.read().decode('utf-8', 'replace')
err = stderr.read().decode('utf-8', 'replace')
print(out)
if err.strip():
    print('stderr:', err)
client.close()
