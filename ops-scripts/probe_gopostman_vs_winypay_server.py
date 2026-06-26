import paramiko, json, datetime
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY /www/wwwroot/jowabuzz/backend/.env")
print('ENV:', o.read().decode())
_,o,_=c.exec_command("grep -n 'baseUrl\\|depositEndpoint\\|pay_url\\|payUrl' /www/wwwroot/jowabuzz/backend/services/winypayService.js | head -30")
print('SERVICE:', o.read().decode())
secret_cmd = "grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env"
_,o,_=c.exec_command(secret_cmd)
secret = o.read().decode().split('=',1)[1].strip()
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
order = f'DEP-PROBE-{int(datetime.datetime.now().timestamp())}-1'
payload = {
    'merchant_code': 'M10AAF98',
    'secret_key': secret,
    'order_id': order,
    'user_id': '1',
    'amount': '100.00',
    'pay_type': 'bkash',
    'current_time': now,
    'jump_url': 'https://jowabuzz.com/profile/deposit',
    'callback_url': 'https://jowabuzz.com/api/payment/winypay/deposit-callback',
}
body = json.dumps(payload)
for base in ['https://bd.gopostman.com', 'https://bd.winypay.com']:
    cmd = f"curl -sS -m 25 -X POST '{base}/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body}'"
    _,o,_=c.exec_command(cmd, timeout=35)
    print(f'=== {base} ===')
    print(o.read().decode().strip())
c.close()
