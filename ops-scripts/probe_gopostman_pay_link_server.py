import paramiko, json, datetime, time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
order = f'DEP-LINK-{int(datetime.datetime.now().timestamp())}-1'
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
_,o,_=c.exec_command(f"curl -sS -m 25 -X POST 'https://bd.gopostman.com/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body}'")
raw = o.read().decode().strip()
print('DEPOSIT:', raw)
data = json.loads(raw)
internal = data.get('internal_txn_id','')
order_id = data.get('order_id', order)

# probe pay pages on gopostman
paths = [
    f'/pay.php?internal_txn_id={internal}',
    f'/pay.php?order_id={order_id}',
    f'/pay.php?txn={internal}',
    f'/pay.php?transaction_id={internal}',
    f'/pay.php?id={internal}',
    '/pay.php',
]
for p in paths:
    url = 'https://bd.gopostman.com' + p
    _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 12 '{url}'")
    print('gopostman', p[:50], o.read().decode())

# probe secondary API endpoints with order/internal
endpoints = [
    'get_pay_url.php','pay_url.php','payment_link.php','deposit_link.php','deposit_status.php',
    'query.php','status.php','order_status.php','payin_link.php','payin_status.php'
]
for ep in endpoints:
    pl = json.dumps({
        'merchant_code':'M10AAF98','secret_key':secret,
        'order_id':order_id,'internal_txn_id':internal
    }).replace('"','\\"')
    cmd = f'curl -sS -m 12 -X POST "https://bd.gopostman.com/api/merchant/payin/{ep}" -H "Content-Type: application/json" -d "{pl}" -w "\\nHTTP:%{{http_code}}"'
    _,o,_=c.exec_command(cmd, timeout=20)
    out=o.read().decode().strip()
    if '404' not in out and 'HTTP:404' not in out:
        print('EP', ep, out[:250])

# check if gopostman pay.php with token from winypay domain works - call winypay ONLY to get token pattern
order2 = f'DEP-LINK2-{int(time.time())}-1'
payload2 = dict(payload)
payload2['order_id'] = order2
body2 = json.dumps(payload2)
_,o,_=c.exec_command(f"curl -sS -m 25 -X POST 'https://bd.winypay.com/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body2}'")
raw2 = o.read().decode().strip()
print('WINYPAY API:', raw2)
try:
    d2 = json.loads(raw2)
    pay_url = d2.get('pay_url','')
    if pay_url:
        for base in ['https://bd.gopostman.com', 'https://bd.winypay.com']:
            token = pay_url.split('token=')[-1] if 'token=' in pay_url else ''
            if token:
                _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 12 '{base}/pay.php?token={token}'")
                print('token on', base, o.read().decode())
except Exception as ex:
    print(ex)
c.close()
