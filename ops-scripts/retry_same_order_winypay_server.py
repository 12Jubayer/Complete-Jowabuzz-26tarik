import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
order='DEP-1782235988209-38'
internal='DEP202606232332385372'
# re-query same order on winypay API (not create new)
for base, label in [('https://bd.winypay.com','winypay'),('https://bd.gopostman.com','gopostman')]:
    body = json.dumps({
        'merchant_code':'M10AAF98','secret_key':secret,
        'order_id':order,'internal_txn_id':internal,
        'user_id':'38','amount':'100.00','pay_type':'bkash',
        'current_time':'2026-06-23 17:00:00',
        'jump_url':'https://jowabuzz.com/profile/deposit',
        'callback_url':'https://jowabuzz.com/api/payment/winypay/deposit-callback',
    })
    cmd = f"curl -sS -m 20 -X POST '{base}/api/merchant/payin/deposit.php' -H 'Content-Type: application/json' -d '{body}'"
    _,o,_=c.exec_command(cmd, timeout=30)
    print(label, o.read().decode().strip())
c.close()
