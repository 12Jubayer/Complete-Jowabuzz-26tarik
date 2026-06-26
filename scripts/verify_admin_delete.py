#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

queries = [
    "SELECT id, name, email, role, status FROM admins ORDER BY id",
    "SELECT id, email, status FROM admins WHERE email LIKE '%gmail.com%' OR status='deleted'",
]

for q in queries:
    print('---', q[:70])
    _, stdout, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -t -e "{q}" 2>/dev/null')
    print(stdout.read().decode())

c.close()
