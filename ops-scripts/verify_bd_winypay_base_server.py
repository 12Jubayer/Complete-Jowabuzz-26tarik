import paramiko, json, datetime
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
order = f'DEP-VERIFY-{int(datetime.datetime.now().timestamp())}-999'
payload = {
    'merchant_code': 'M10AAF98',
    'secret_key': secret,
    'order_id': order,
    'user_id': '999',
    'amount': '100.00',
    'pay_type': 'bkash',
    'current_time': now,
    'jump_url': 'https://jowabuzz.com/profile/deposit',
    'callback_url': 'https://jowabuzz.com/api/payment/winypay/deposit-callback',
}
body = json.dumps(payload)
cmd = f"""curl -sS -m 30 -X POST 'https://bd.winypay.com/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body}'"""
_,o,_=c.exec_command(cmd, timeout=45)
resp = o.read().decode().strip()
print('API:', resp)
data = json.loads(resp)
pay_url = data.get('pay_url','')
if pay_url:
    _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 15 '{pay_url}'")
    print('PAY PAGE HTTP:', o.read().decode())
c.close()
