"""Audit user 31 double deposit credit on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, username, name, phone, balance FROM users WHERE id=31 OR username='Din1122' OR id=878100975 LIMIT 5\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, user_id, type, amount, status, method, created_at, approved_at FROM transactions WHERE user_id=31 ORDER BY id DESC LIMIT 20\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM deposit_requests WHERE user_id=31 ORDER BY id DESC LIMIT 10\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM winypay_payment_orders WHERE user_id=31 ORDER BY id DESC LIMIT 10\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%wallet%'\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%balance%'\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%ledger%'\"",
]

for cmd in cmds:
    print('===', cmd[:95], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

c.close()
