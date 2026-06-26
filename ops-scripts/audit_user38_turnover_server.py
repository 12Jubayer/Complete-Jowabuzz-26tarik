import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -n 'creditAutomatic\\|ensureDeposit\\|mergeTurnover\\|processDepositBalanceBonus\\|required_turnover' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -40",
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT u.id, u.name, a.deposit_amount, a.bonus_amount, a.bonus_percent, a.turnover_multiplier,
       a.required_turnover, a.completed_turnover, a.status, r.title, dr.bonus_rule_id
FROM user_bonus_accounts a
JOIN users u ON u.id=a.user_id
JOIN deposit_bonus_rules r ON r.id=a.rule_id
LEFT JOIN deposit_requests dr ON dr.transaction_id=a.deposit_transaction_id
WHERE u.name LIKE '%Dinislam%' OR u.id=38
ORDER BY a.id DESC LIMIT 5" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT id, title, bonus_percent, turnover_multiplier FROM deposit_bonus_rules WHERE is_active=1" """,
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd, timeout=45)
    print('===', cmd[:55].replace('\n',' '))
    print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
