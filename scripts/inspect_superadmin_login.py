#!/usr/bin/env python3
import paramiko

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)

queries = [
    "SELECT id, name, email, role, status, LEFT(password_hash, 20) AS hash_prefix, LENGTH(password_hash) AS hash_len, permissions FROM admins ORDER BY id",
    "SELECT id, name, email, role, status FROM users WHERE email LIKE '%jowabuzzofficial%' OR role IN ('admin','super_admin')",
    "SELECT COUNT(*) AS deleted_admin FROM admins WHERE email='admin@jowabuzz.com'",
]

for q in queries:
    print('---')
    _, stdout, stderr = c.exec_command(
        f'mysql -uroot -p656940d50e847e3f jowabuzz -t -e "{q}" 2>/dev/null'
    )
    print(stdout.read().decode('utf-8', errors='replace'))

c.close()
