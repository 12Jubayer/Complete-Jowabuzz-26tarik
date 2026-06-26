#!/usr/bin/env python3
import sys
import time
import paramiko
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HOST, USER, PASSWORD = '103.168.173.101', 'root', 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
root = Path(__file__).resolve().parent.parent
rels = [
    'backend/services/softapiService.js',
    'backend/scripts/test_softapi_integration.js',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = client.open_sftp()
for rel in rels:
    sftp.put(str(root / rel), f'{REMOTE}/{rel}')
sftp.close()
client.exec_command('pm2 restart jowabuzz --update-env', timeout=60)[1].read()
time.sleep(4)
_, stdout, stderr = client.exec_command(f'cd {REMOTE}/backend && node scripts/test_softapi_integration.js', timeout=180)
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
client.close()
