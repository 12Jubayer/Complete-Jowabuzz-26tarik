#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
_, o, _ = c.exec_command('cat /etc/nginx/sites-available/jowabuzz.com', timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
