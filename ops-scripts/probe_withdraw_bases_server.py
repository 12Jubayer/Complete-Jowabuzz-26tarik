import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_PAYOUT_KEY /www/wwwroot/jowabuzz/backend/.env")
payout = o.read().decode().split('=',1)[1].strip()
import datetime
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
order = f'WDR-PROBE-{int(datetime.datetime.now().timestamp())}-1'
payload = {
    'merchant_code': 'M10AAF98',
    'payout_key': payout,
    'order_id': order,
    'user_id': '1',
    'amount': '100.00',
    'pay_type': 'bkash',
    'account_no': '01700000000',
    'account_name': 'Test',
    'current_time': now,
    'callback_url': 'https://jowabuzz.com/api/payment/winypay/withdraw-callback',
}
body = json.dumps(payload)
for base in ['https://bd.gopostman.com', 'https://bd.winypay.com']:
    cmd = f"curl -sS -m 20 -X POST '{base}/api/merchant/payout/withdrawal.php' -H 'Content-Type: application/json' -d '{body}'"
    _,o,_=c.exec_command(cmd, timeout=30)
    print(base, o.read().decode().strip()[:250])
c.close()
