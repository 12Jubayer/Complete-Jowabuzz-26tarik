import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, name, balance FROM users WHERE id=31;
SELECT id, deposit_amount, required_turnover, completed_turnover, status FROM user_bonus_accounts WHERE user_id=31 ORDER BY id;
SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id=31;
" """)
print('DB:', o.read().decode())
_, o, _ = c.exec_command("grep -n 'bonusBalance\\|bonusProgress\\|Turnover' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx | head -30")
print('UI:', o.read().decode())
c.close()
