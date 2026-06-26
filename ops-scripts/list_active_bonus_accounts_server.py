import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT a.id, a.user_id, u.name, a.deposit_amount, a.required_turnover, a.completed_turnover, a.status
FROM user_bonus_accounts a JOIN users u ON u.id=a.user_id
WHERE a.status='in_progress' ORDER BY a.user_id, a.id;
" """)
print(o.read().decode())
c.close()
