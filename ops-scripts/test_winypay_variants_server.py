import paramiko, json, time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

def curl_deposit(extra_fields=None, label=''):
    extra = json.dumps(extra_fields or {})[1:-1]
    extra_part = (',' + extra) if extra else ''
    cmd = rf'''bash -lc 'export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); ORDER="DEP-TEST-$(date +%s%N | cut -c1-13)-999"; NOW=$(date "+%Y-%m-%d %H:%M:%S"); curl -sS -X POST "https://bd.gopostman.com/api/merchant/payin/deposit.php" -H "Content-Type: application/json" -d "{{\"merchant_code\":\"$WINYPAY_MERCHANT_CODE\",\"secret_key\":\"$WINYPAY_SECRET_KEY\",\"order_id\":\"$ORDER\",\"user_id\":\"999\",\"amount\":\"100.00\",\"pay_type\":\"bkash\",\"current_time\":\"$NOW\",\"jump_url\":\"https://jowabuzz.com/profile/deposit\",\"callback_url\":\"https://jowabuzz.com/api/payment/winypay/deposit-callback\"{extra_part}}}"' '''
    _,o,_=c.exec_command(cmd, timeout=60)
    out=o.read().decode().strip()
    print(label, out)

for fields, label in [
    ({}, 'base'),
    ({'channel': 'Personal'}, 'channel Personal'),
    ({'channel': 'Agent'}, 'channel Agent'),
    ({'channel': 'Merchant'}, 'channel Merchant'),
    ({'pay_channel': 'Personal'}, 'pay_channel'),
    ({'account_type': 'Personal'}, 'account_type'),
    ({'currency': 'BDT'}, 'currency'),
    ({'amount': '500.00'}, 'amount 500 via separate'),
]:
    curl_deposit(fields, label)
    time.sleep(1)

# test nagad
curl_deposit({'pay_type': 'nagad'}, 'nagad explicit in json - broken')
# proper nagad test
cmd = r'''bash -lc 'export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); ORDER="DEP-TEST-NAGAD-$(date +%s)-999"; NOW=$(date "+%Y-%m-%d %H:%M:%S"); curl -sS -X POST "https://bd.gopostman.com/api/merchant/payin/deposit.php" -H "Content-Type: application/json" -d "{\"merchant_code\":\"$WINYPAY_MERCHANT_CODE\",\"secret_key\":\"$WINYPAY_SECRET_KEY\",\"order_id\":\"$ORDER\",\"user_id\":\"999\",\"amount\":\"100.00\",\"pay_type\":\"nagad\",\"current_time\":\"$NOW\",\"jump_url\":\"https://jowabuzz.com/profile/deposit\",\"callback_url\":\"https://jowabuzz.com/api/payment/winypay/deposit-callback\"}"' '''
_,o,_=c.exec_command(cmd, timeout=60)
print('nagad', o.read().decode().strip())

# check successful order pay_url from DB - fetch page
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT pay_url FROM winypay_payment_orders WHERE pay_url IS NOT NULL AND pay_url!='' ORDER BY id DESC LIMIT 1\"")
old_url = o.read().decode().strip()
print('old url', old_url[:80])
if old_url:
    _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 15 '{old_url}'")
    print('old url status', o.read().decode())

c.close()
