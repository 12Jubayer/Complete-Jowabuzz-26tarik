#!/usr/bin/env python3
import sys
from pathlib import Path
import paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(__file__).resolve().parent.parent
for rel in ['backend/services/oracleGamingApiService.js', 'backend/services/gamingGatewayService.js']:
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
    sftp = c.open_sftp(); sftp.put(str(ROOT / rel), f'/www/wwwroot/jowabuzz/{rel}'); sftp.close()
    print('uploaded', rel)
    _, o, _ = c.exec_command('pm2 restart jowabuzz', timeout=60); print(o.read().decode()); c.close()
