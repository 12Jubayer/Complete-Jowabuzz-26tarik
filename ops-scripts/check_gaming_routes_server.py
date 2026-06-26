import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -E 'HMK|ORACLE|PRIMARY|DISABLED' /www/wwwroot/jowabuzz/backend/.env",
    "grep -rn 'handleHmk\\|handleOracle\\|processCallback\\|applyDepositBonusTurnover' /www/wwwroot/jowabuzz/backend/routes/ /www/wwwroot/jowabuzz/backend/controllers/ 2>/dev/null | head -30",
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT COUNT(*) FROM hmk_game_transactions WHERE user_id=31; SELECT COUNT(*) FROM bet_records WHERE user_id=31;\"",
]
for cmd in cmds:
    print('===', cmd[:80])
    _,o,e=c.exec_command(cmd)
    print(o.read().decode())
    err=e.read().decode()
    if err and 'Warning' not in err: print('ERR', err)
c.close()
