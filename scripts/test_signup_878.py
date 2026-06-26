#!/usr/bin/env python3
"""Test re-register jb after delete on production."""
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

REMOTE_SCRIPT = """
set -e
echo REGISTER:
curl -s -w "\\nHTTP:%{http_code}\\n" -X POST http://127.0.0.1:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"jb","phone":"01900000000","password":"test1234"}'
echo DB:
mysql -uroot -p656940d50e847e3f jowabuzz -e "SELECT id,name,phone,status FROM users WHERE name='jb';"
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=60, banner_timeout=120)
stdin, stdout, stderr = c.exec_command(REMOTE_SCRIPT, timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))
c.close()
