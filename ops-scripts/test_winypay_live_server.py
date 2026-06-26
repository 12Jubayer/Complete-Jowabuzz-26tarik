import paramiko, json, urllib.request
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
# read env keys
_,o,_=c.exec_command("grep '^WINYPAY_' /www/wwwroot/jowabuzz/backend/.env")
env = {}
for line in o.read().decode().splitlines():
    if '=' in line:
        k,v = line.split('=',1)
        env[k]=v
merchant = env.get('WINYPAY_MERCHANT_CODE','')
secret = env.get('WINYPAY_SECRET_KEY','')
import datetime
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
payload = {
    'merchant_code': merchant,
    'secret_key': secret,
    'order_id': f'DEP-TEST-{int(datetime.datetime.now().timestamp()*1000)}-999',
    'user_id': '999',
    'amount': '100.00',
    'pay_type': 'bkash',
    'current_time': now,
    'jump_url': 'https://jowabuzz.com/profile/deposit',
    'callback_url': 'https://jowabuzz.com/api/payment/winypay/deposit-callback',
}
body = json.dumps(payload).encode()
req = urllib.request.Request('https://bd.gopostman.com/api/merchant/payin/deposit.php', data=body, headers={'Content-Type':'application/json','Accept':'application/json'})
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
        print('LIVE TEST RESPONSE:')
        print(json.dumps(data, indent=2))
except Exception as e:
    print('TEST FAILED', e)
c.close()
