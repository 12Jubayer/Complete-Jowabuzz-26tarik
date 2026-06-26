import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT api_response FROM winypay_payment_orders WHERE id=16 LIMIT 1\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT api_response FROM winypay_payment_orders WHERE id=24 LIMIT 1\"",
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd)
    print(o.read().decode())

token='2af3c878ebfa6afce2d900bfa5a74707cdd33b02c770095e7fa3b26b9b60095a'
for u in [
    f'https://winypay.com/pay.php?token={token}',
    f'https://www.winypay.com/pay.php?token={token}',
    f'https://bd.gopostman.com/pay.php?token={token}',
    f'https://pay.winypay.com/?token={token}',
]:
    _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 15 '{u}'")
    print(u[:60], o.read().decode())

# check if gopostman has pay redirect in response headers
cmd = r'''bash -lc 'export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); ORDER="DEP-TEST-H-$(date +%s)-999"; NOW=$(date "+%Y-%m-%d %H:%M:%S"); curl -sS -D - -o /tmp/wp_body.json -X POST "https://bd.gopostman.com/api/merchant/payin/deposit.php" -H "Content-Type: application/json" -d "{\"merchant_code\":\"$WINYPAY_MERCHANT_CODE\",\"secret_key\":\"$WINYPAY_SECRET_KEY\",\"order_id\":\"$ORDER\",\"user_id\":\"999\",\"amount\":\"100.00\",\"pay_type\":\"bkash\",\"current_time\":\"$NOW\",\"jump_url\":\"https://jowabuzz.com/profile/deposit\",\"callback_url\":\"https://jowabuzz.com/api/payment/winypay/deposit-callback\"}"; echo BODY:; cat /tmp/wp_body.json' '''
_,o,_=c.exec_command(cmd, timeout=60)
print(o.read().decode())
c.close()
