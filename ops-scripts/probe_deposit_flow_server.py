"""Probe deposit flow on production server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'deposit\\|callback\\|webhook\\|wallet' /www/wwwroot/jowabuzz/backend/routes --include='*.js' 2>/dev/null | head -40",
    "grep -rn 'approveDeposit\\|creditWallet\\|addBalance\\|deposit.*success\\|payment.*callback' /www/wwwroot/jowabuzz/backend --include='*.js' 2>/dev/null | head -50",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%deposit%'; SHOW TABLES LIKE '%payment%'; SHOW TABLES LIKE '%transaction%';\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, user_id, amount, status, gateway, created_at, updated_at FROM deposits ORDER BY id DESC LIMIT 10\" 2>/dev/null || mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM deposit_requests ORDER BY id DESC LIMIT 5\" 2>/dev/null",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode('utf-8', 'replace')
    err = e.read().decode('utf-8', 'replace')
    print(out[:5000] or err[:2000])
    print()

c.close()
