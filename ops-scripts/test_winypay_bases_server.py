import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("cat /www/wwwroot/jowabuzz/backend/.env")
env = o.read().decode()
print(env)
bases = [
    'https://bd.gopostman.com',
    'https://gopostman.com',
    'https://api.winypay.com',
    'https://bd.winypay.com',
    'https://pay.winypay.com',
]
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
merchant='M10AAF98'
import datetime
now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
for base in bases:
    order=f'DEP-BASETEST-{base.split("//")[1].split(".")[0]}-{int(datetime.datetime.now().timestamp())}'
    payload = {
        'merchant_code': merchant,
        'secret_key': secret,
        'order_id': order,
        'user_id': '999',
        'amount': '100.00',
        'pay_type': 'bkash',
        'current_time': now,
        'jump_url': 'https://jowabuzz.com/profile/deposit',
        'callback_url': 'https://jowabuzz.com/api/payment/winypay/deposit-callback',
    }
    body = json.dumps(payload).replace('"', '\\"')
    cmd = f'curl -sS -m 20 -X POST "{base}/api/merchant/payin/deposit.php" -H "Content-Type: application/json" -d "{body}" -w "\\nHTTP:%{{http_code}}"'
    _,o,e=c.exec_command(cmd, timeout=30)
    out=o.read().decode().strip()
    print('BASE', base, out[:200])
c.close()
