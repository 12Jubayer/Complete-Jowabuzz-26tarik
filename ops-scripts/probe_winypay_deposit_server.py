"""Deep dive deposit + winypay on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM winypay_payment_orders ORDER BY id DESC LIMIT 10\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, user_id, type, amount, status, reference, gateway, created_at FROM transactions ORDER BY id DESC LIMIT 15\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, username, balance FROM users WHERE id IN (31,24,64)\"",
    "cat /www/wwwroot/jowabuzz/backend/services/winypayCallbackService.js",
    "cat /www/wwwroot/jowabuzz/backend/services/adminDepositService.js",
]

for i, cmd in enumerate(cmds, 1):
    print(f'======== {i} ========')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:12000])
    print()

c.close()
