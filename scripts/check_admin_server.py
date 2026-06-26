#!/usr/bin/env python3
import paramiko

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
cmds = [
    'curl -sI http://127.0.0.1/admin/login -H Host:jowabuzz.com | head -15',
    'curl -s http://127.0.0.1/admin/login -H Host:jowabuzz.com | head -50',
    'grep -n admin /www/server/panel/vhost/nginx/jowabuzz.com.conf 2>/dev/null || true',
    'ls -la /www/wwwroot/jowabuzz/frontend/dist/assets/index-*.js 2>/dev/null | tail -3',
    'head -95 /www/wwwroot/jowabuzz/frontend/dist/index.html',
    'pm2 list | grep jowabuzz',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
for cmd in cmds:
    print('===', cmd)
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode('utf-8', 'replace')
    err = e.read().decode('utf-8', 'replace')
    print(out)
    if err.strip():
        print('ERR:', err)
c.close()
