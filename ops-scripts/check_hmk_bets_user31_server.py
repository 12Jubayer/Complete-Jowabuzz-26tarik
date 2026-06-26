import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT COUNT(*) as cnt, COALESCE(SUM(bet_amount),0) as total_bet, COALESCE(SUM(win_amount),0) as total_win
FROM hmk_game_transactions WHERE user_id=31;
SELECT id, bet_amount, win_amount, status, created_at FROM hmk_game_transactions WHERE user_id=31 ORDER BY id DESC LIMIT 10;
SELECT id, completed_turnover, updated_at FROM user_bonus_accounts WHERE user_id=31;
"""

sftp = c.open_sftp()
with sftp.file('/tmp/hmk_bets.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/hmk_bets.sql')
print(o.read().decode())

_, o, _ = c.exec_command("sed -n '780,880p' /www/wwwroot/jowabuzz/backend/services/hmkApiService.js")
print('=== hmk callback bet section ===')
print(o.read().decode())
c.close()
