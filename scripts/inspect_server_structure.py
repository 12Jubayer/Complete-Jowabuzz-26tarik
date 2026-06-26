#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    'find /www/wwwroot/jowabuzz -maxdepth 3 -type f -name "package.json" 2>/dev/null',
    'find /www/wwwroot/jowabuzz -maxdepth 2 -type d 2>/dev/null | sort',
    'ls -la /www/wwwroot/jowabuzz/backend | head -30',
    'ls -la /www/wwwroot/jowabuzz/frontend | head -30',
    'wc -l $(find /www/wwwroot/jowabuzz -type f ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null) 2>/dev/null | tail -1',
    'find /www/wwwroot/jowabuzz -type f ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | wc -l',
]

for cmd in cmds:
    print('===', cmd, '===')
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    print(stdout.read().decode('utf-8', 'replace'))

client.close()
