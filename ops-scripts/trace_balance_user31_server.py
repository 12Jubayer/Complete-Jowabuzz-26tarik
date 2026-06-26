"""Trace balance changes for user 31."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM user_wallets WHERE user_id=31\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM wallets WHERE user_id=31\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM deposit_bonus_rules WHERE id=2\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM user_deposit_bonuses WHERE user_id=31 ORDER BY id DESC LIMIT 10\" 2>/dev/null",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%bonus%'\"",
    "grep -rn 'deposit_bonus\\|processDepositBalanceBonus\\|bonus.*balance' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js 2>/dev/null | head -30",
    "sed -n '1,200p' /www/wwwroot/jowabuzz/backend/services/adminTransactionService.js",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:5000])
    print()

c.close()
