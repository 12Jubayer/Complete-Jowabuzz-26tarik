#!/usr/bin/env python3
import json
import paramiko

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)

queries = [
    "SELECT id, name, email, role, status, permissions FROM admins ORDER BY id",
]

for q in queries:
    _, stdout, _ = c.exec_command(
        f'mysql -uroot -p656940d50e847e3f jowabuzz -t -e "{q}" 2>/dev/null'
    )
    print(stdout.read().decode('utf-8', errors='replace'))

c.close()
