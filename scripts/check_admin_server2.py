#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
cmds = [
    'curl -sk https://127.0.0.1/admin/login -H Host:jowabuzz.com | head -20',
    'grep -c /admin/login /www/wwwroot/jowabuzz/frontend/dist/assets/index-C2xgaJCB.js',
    'grep -c AdminLoginPage /www/wwwroot/jowabuzz/frontend/dist/assets/index-C2xgaJCB.js',
    'curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/admin/login -H Host:jowabuzz.com',
    'curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/admin -H Host:jowabuzz.com',
    'cat /www/server/panel/vhost/nginx/jowabuzz.com.conf',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
for cmd in cmds:
    print('===', cmd)
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000])
c.close()
