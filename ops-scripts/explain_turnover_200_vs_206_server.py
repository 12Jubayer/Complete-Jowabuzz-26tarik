import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, name, balance FROM users WHERE id=31;
SELECT id, amount, method FROM transactions WHERE user_id=31 AND id>=130 ORDER BY id;
SELECT id, deposit_amount, bonus_amount, required_turnover, completed_turnover, status FROM user_bonus_accounts WHERE user_id=31 ORDER BY id DESC LIMIT 3;
SELECT id, title, bonus_percent FROM deposit_bonus_rules;
" """)
print(o.read().decode())
_, o, _ = c.exec_command("grep -n 'newDepositTurnover\\|creditAutomaticMainWallet\\|bonusAmount' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -25")
print('CODE:', o.read().decode())
c.close()
