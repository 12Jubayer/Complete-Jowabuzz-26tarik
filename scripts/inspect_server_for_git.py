#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    'ls -la /www/wwwroot/jowabuzz | head -40',
    'du -sh /www/wwwroot/jowabuzz',
    'du -sh /www/wwwroot/jowabuzz/node_modules /www/wwwroot/jowabuzz/frontend/node_modules /www/wwwroot/jowabuzz/frontend/dist 2>/dev/null || true',
    'test -d /www/wwwroot/jowabuzz/.git && echo HAS_GIT || echo NO_GIT',
    'ls /www/wwwroot/jowabuzz/.env /www/wwwroot/jowabuzz/backend/.env 2>/dev/null || echo no env listed',
    'which git',
    'git --version',
]

for cmd in cmds:
    print('===', cmd, '===')
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    print(stdout.read().decode('utf-8', 'replace'))
    err = stderr.read().decode('utf-8', 'replace')
    if err.strip():
        print('stderr:', err)

client.close()
