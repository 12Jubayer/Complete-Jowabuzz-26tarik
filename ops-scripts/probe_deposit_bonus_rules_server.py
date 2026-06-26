"""Probe deposit bonus rules and flow on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM deposit_bonus_rules ORDER BY id\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM bonus_turnover_rules ORDER BY id\" 2>/dev/null",
    "grep -rn 'processDepositBonusTurnover\\|processDepositBalanceBonus\\|bonus_percent\\|3%' /www/wwwroot/jowabuzz/backend/services --include='*.js' 2>/dev/null | head -40",
    "sed -n '1,120p' /www/wwwroot/jowabuzz/backend/services/bonusTurnoverService.js",
    "sed -n '480,700p' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js",
]

for i, cmd in enumerate(cmds, 1):
    print(f'======== {i} ========')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:8000])
    print()

c.close()
