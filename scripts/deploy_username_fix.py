#!/usr/bin/env python3
import sys
from pathlib import Path
import paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parent.parent
REMOTE = '/www/wwwroot/jowabuzz'
FILES = [
    'backend/services/gamingGatewayService.js',
    'backend/services/oracleGamingApiService.js',
]
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in FILES:
    sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
    print('uploaded', rel)
sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz && sleep 2 && curl -s http://127.0.0.1:3001/api/health', timeout=60)
print(o.read().decode())
c.close()
