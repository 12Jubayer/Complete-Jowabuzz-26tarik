import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT order_id, status, transaction_id, amount, callback_payload, callback_signature, gateway_transaction_id FROM winypay_payment_orders WHERE order_id='DEP-1782231433442-31';
" """)
print(o.read().decode())
_, o, _ = c.exec_command("grep -n 'verifyWinypayCallbackSignature\\|WINYPAY' /www/wwwroot/jowabuzz/backend/.env | head -10")
print(o.read().decode())
c.close()
