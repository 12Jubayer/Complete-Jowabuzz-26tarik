import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep 'deposit_callback' /www/wwwroot/jowabuzz/backend/logs/winypay.log | tail -25",
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT w.order_id, w.status, t.status, t.amount, t.user_id, w.processed_at
FROM winypay_payment_orders w
JOIN transactions t ON t.id = w.transaction_id
WHERE w.status='success' ORDER BY w.id DESC LIMIT 5" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, user_id, amount, status, method, created_at
FROM transactions WHERE type='deposit' AND status='approved' ORDER BY id DESC LIMIT 5" """,
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd, timeout=45)
    print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
