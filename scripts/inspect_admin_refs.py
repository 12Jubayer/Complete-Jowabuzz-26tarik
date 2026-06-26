#!/usr/bin/env python3
import paramiko

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'
ADMIN_ID = 1

checks = [
    f"SELECT COUNT(*) AS c FROM admin_audit_logs WHERE admin_id = {ADMIN_ID}",
    f"SELECT COUNT(*) AS c FROM movecash_app_links WHERE created_by_admin_id = {ADMIN_ID}",
    f"SELECT COUNT(*) AS c FROM affiliate_settlement_user_history WHERE changed_by_admin_id = {ADMIN_ID}",
    f"SELECT COUNT(*) AS c FROM chat_conversations WHERE assigned_admin_id = {ADMIN_ID}",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)

for q in checks:
    table = q.split('FROM ')[1].split(' WHERE')[0]
    _, stdout, _ = c.exec_command(
        f'mysql -uroot -p656940d50e847e3f jowabuzz -N -e "{q}" 2>/dev/null'
    )
    print(f"{table}: {stdout.read().decode().strip()}")

c.close()
