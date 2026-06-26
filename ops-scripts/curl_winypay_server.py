import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = r'''bash -lc 'source /www/wwwroot/jowabuzz/backend/.env 2>/dev/null; export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); ORDER="DEP-TEST-$(date +%s)-999"; NOW=$(date "+%Y-%m-%d %H:%M:%S"); curl -sS -X POST "https://bd.gopostman.com/api/merchant/payin/deposit.php" -H "Content-Type: application/json" -d "{\"merchant_code\":\"$WINYPAY_MERCHANT_CODE\",\"secret_key\":\"$WINYPAY_SECRET_KEY\",\"order_id\":\"$ORDER\",\"user_id\":\"999\",\"amount\":\"100.00\",\"pay_type\":\"bkash\",\"current_time\":\"$NOW\",\"jump_url\":\"https://jowabuzz.com/profile/deposit\",\"callback_url\":\"https://jowabuzz.com/api/payment/winypay/deposit-callback\"}"' '''
_,o,e=c.exec_command(cmd, timeout=60)
print('OUT:', o.read().decode())
print('ERR:', e.read().decode())
c.close()
