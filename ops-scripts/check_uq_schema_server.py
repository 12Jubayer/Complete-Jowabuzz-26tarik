import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW CREATE TABLE user_bonus_accounts\\G\"")
print(o.read().decode())
_, o, _ = c.exec_command("SELECT id, user_id, deposit_transaction_id, status FROM user_bonus_accounts WHERE user_id=38")
c.close()
