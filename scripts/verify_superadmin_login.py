#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

tests = [
    ('correct', '{"email":"jowabuzzofficial@gmail.com","password":"112233"}'),
    ('wrong', '{"email":"jowabuzzofficial@gmail.com","password":"badpass"}'),
    ('trim', '{"email":"  JowabuzzOfficial@gmail.com  ","password":"112233"}'),
]

for name, body in tests:
    _, stdout, _ = c.exec_command(
        f"curl -s -w '\\nHTTP:%{{http_code}}' -X POST http://127.0.0.1:3001/api/admin/login "
        f"-H 'Content-Type: application/json' -d '{body}'"
    )
    print(f'=== {name} ===')
    print(stdout.read().decode())

c.close()
