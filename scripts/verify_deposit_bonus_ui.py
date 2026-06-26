#!/usr/bin/env python3
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'grep -o "Select Bonus" /www/wwwroot/jowabuzz/frontend/dist/assets/index-*.js | head -1',
    'mysql -uroot -p656940d50e847e3f jowabuzz -e "SHOW COLUMNS FROM deposit_requests LIKE \'bonus_rule_id\'"',
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    print(o.read().decode('utf-8', 'replace'))
    err = e.read().decode('utf-8', 'replace')
    if err.strip():
        print('err:', err)
c.close()
