#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

queries = [
    "SELECT id, name, phone, email, role, status, user_uid FROM users WHERE name LIKE '%jb%' OR name='jb' ORDER BY id",
    "SELECT COUNT(*) AS cnt FROM users WHERE name='jb' AND role='user'",
    "SELECT COUNT(*) AS deleted_cnt FROM users WHERE name='jb' AND role='user' AND status='deleted'",
    "SHOW CREATE TABLE users\\G",
]

for q in queries:
    print('===', q[:80])
    _, stdout, stderr = c.exec_command(
        f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{q}" 2>/dev/null'
    )
    out = stdout.read().decode('utf-8', errors='replace')
    print(out[:3000] if out else stderr.read().decode()[:500])

c.close()
