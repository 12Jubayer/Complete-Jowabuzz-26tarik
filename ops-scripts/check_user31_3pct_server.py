import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT u.id, u.username, u.balance FROM users u WHERE u.id=31;
SELECT id, user_id, amount, method, created_at FROM transactions WHERE user_id=31 AND method LIKE 'deposit_main_bonus%' ORDER BY id DESC LIMIT 5;
SELECT id, user_id, amount, status, method FROM transactions WHERE user_id=31 AND id=123;
"
"""
_,o,e=c.exec_command(cmd)
print(o.read().decode())
err=e.read().decode()
if err: print('ERR', err)
c.close()
