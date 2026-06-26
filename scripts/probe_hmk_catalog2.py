#!/usr/bin/env python3
import paramiko
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
sftp.put(str(ROOT / 'backend/scripts/probe_oracle_launch.js'), '/www/wwwroot/jowabuzz/backend/scripts/probe_oracle_launch.js')
sftp.close()
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node scripts/probe_oracle_launch.js', timeout=180000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:800])
c.close()
