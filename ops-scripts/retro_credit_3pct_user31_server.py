import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

check_cmd = """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "SELECT COUNT(*) FROM transactions WHERE method='deposit_main_bonus:1:123'" """
_, o, _ = c.exec_command(check_cmd)
count = o.read().decode().strip()
print('existing_count', count)

if count == '0':
    sql = """
START TRANSACTION;
UPDATE users SET balance = balance + 3 WHERE id = 31;
INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
VALUES (31, 'bonus', 3, 'approved', 'deposit_main_bonus:1:123', NOW());
SET @tid = LAST_INSERT_ID();
INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
VALUES (31, 'Automatic Deposit Bonus (Main Wallet)', 3, 'approved', @tid);
COMMIT;
SELECT balance FROM users WHERE id=31;
"""
    sftp = c.open_sftp()
    with sftp.file('/tmp/retro_3pct.sql', 'w') as f:
        f.write(sql)
    sftp.close()
    _, o, e = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/retro_3pct.sql')
    print(o.read().decode())
    err = e.read().decode()
    if err:
        print(err)
else:
    print('SKIP already credited')

c.close()
