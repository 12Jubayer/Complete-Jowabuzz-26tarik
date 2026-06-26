import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, type, amount, status, created_at FROM transactions WHERE user_id=31 AND type='deposit' ORDER BY id DESC LIMIT 8;
SELECT id, deposit_amount, required_turnover, completed_turnover, status FROM user_bonus_accounts WHERE user_id=31 ORDER BY id DESC;
SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id=31;
SELECT user_id, source_type, turnover_amount, created_at FROM turnover_records WHERE user_id=31 ORDER BY id DESC LIMIT 5;
" """)
print(o.read().decode())
_, o, _ = c.exec_command("grep -rn 'addRequiredTurnover' /www/wwwroot/jowabuzz/backend --include='*.js' | head -15")
print('addRequired:', o.read().decode())
c.close()
