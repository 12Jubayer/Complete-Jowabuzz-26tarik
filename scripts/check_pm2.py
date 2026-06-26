#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command('pm2 list; pm2 logs jowabuzz --lines 30 --nostream', timeout=60)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace'))
c.close()
