import paramiko, json, datetime
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

variants = [
    {},
    {'redirect_type': 'url'},
    {'response_type': 'redirect'},
    {'mode': 'redirect'},
    {'payment_mode': 'redirect'},
    {'return_type': 'json'},
    {'iframe': '0'},
    {'iframe': '1'},
]

for i, extra in enumerate(variants):
    order = f'DEP-V{i}-{int(datetime.datetime.now().timestamp())}-1'
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
        **extra,
    }
    body = json.dumps(payload)
    _,o,_=c.exec_command(f"curl -sS -m 20 -X POST 'https://bd.gopostman.com/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body}'")
    print(extra or 'base', o.read().decode().strip()[:220])

# fetch docs pages
for url in [
    'https://bd.gopostman.com/pages/documentation.html',
    'https://bd.gopostman.com/api/merchant/payin/',
]:
    _,o,_=c.exec_command(f"curl -sS -m 15 '{url}' | head -c 1500")
    print('URL', url)
    print(o.read().decode('utf-8', errors='replace')[:1200].encode('ascii', errors='replace').decode())
c.close()
