#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'du -sh /www/wwwroot/jowabuzz/backend/uploads /www/wwwroot/jowabuzz/frontend/dist /www/wwwroot/jowabuzz/backend/node_modules /www/wwwroot/jowabuzz/frontend/node_modules',
    'find /www/wwwroot/jowabuzz/backend/uploads -type f 2>/dev/null | wc -l',
]
for cmd in cmds:
    print('===', cmd)
    _, o, e = client.exec_command(cmd, timeout=120)
    print(o.read().decode())
client.close()
