#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
cmds = [
    'find /www/server/panel/vhost/nginx -name "*jowabuzz*" 2>/dev/null',
    'find /etc/nginx -name "*jowabuzz*" 2>/dev/null',
    'grep -r "jowabuzz.com" /www/server/panel/vhost/nginx/ 2>/dev/null | head -5',
    'nginx -T 2>/dev/null | grep -A30 "server_name jowabuzz.com" | head -40',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
for cmd in cmds:
    print('===', cmd)
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:5000])
c.close()
