#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
CMD = "pm2 logs jowabuzz --lines 30 --nostream 2>&1 | tail -40"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
_, o, e = c.exec_command(CMD, timeout=30)
print(o.read().decode('utf-8', errors='replace'))
c.close()
