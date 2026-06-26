#!/usr/bin/env python3
import paramiko, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
root = Path(__file__).resolve().parent.parent
for rel in [
    'backend/services/oracleGamesApiClient.js',
    'backend/services/oracleGamesApiClient.v2.js',
    'backend/services/gamingGatewayService.js',
]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
    sftp = c.open_sftp()
    sftp.put(str(root / rel), f'/www/wwwroot/jowabuzz/{rel}')
    sftp.close()
    c.close()
    print('uploaded', rel)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command('pm2 restart jowabuzz && sleep 4 && curl -s http://127.0.0.1:3001/api/health', timeout=30000)
print(o.read().decode('utf-8', 'replace'))
c.close()
