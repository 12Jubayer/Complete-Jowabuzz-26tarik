#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

remote = """#!/bin/bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/admin/login -H 'Content-Type: application/json' -d '{"email":"jowabuzzofficial@gmail.com","password":"112233"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
curl -s -w '\\nHTTP:%{http_code}\\n' -X DELETE http://127.0.0.1:3001/api/admin/players/52 -H "Authorization: Bearer $TOKEN"
mysql -uroot -p656940d50e847e3f jowabuzz -N -e "SELECT COUNT(*) FROM users WHERE id=52"
"""

sftp = c.open_sftp()
with sftp.file('/tmp/test_del_jb.sh', 'w') as f:
    f.write(remote)
sftp.close()

_, stdout, stderr = c.exec_command('bash /tmp/test_del_jb.sh 2>&1', timeout=120)
print(stdout.read().decode())
c.close()
