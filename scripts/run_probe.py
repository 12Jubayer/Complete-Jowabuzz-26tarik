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
sftp.put(str(ROOT / 'backend/scripts/probe_sports_db.js'), f'{REMOTE}/backend/scripts/probe_sports_db.js')
sftp.close()
_, o, e = c.exec_command(f'cd {REMOTE}/backend && node scripts/probe_sports_db.js', timeout=300000)
print(o.read().decode('utf-8', 'replace'))
c.close()
