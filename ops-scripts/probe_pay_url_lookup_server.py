import paramiko, json, datetime
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
# use existing gopostman order from DB
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT order_id, internal_txn_id FROM winypay_payment_orders WHERE internal_txn_id IS NOT NULL ORDER BY id DESC LIMIT 3\"")
rows = o.read().decode().strip().split('\n')
print('DB orders:', rows)
if rows and rows[0]:
    order_id, internal = rows[0].split('\t')
else:
    order_id, internal = 'DEP-LINK-1782236481-1', 'DEP202606232340532097'

for base in ['https://bd.gopostman.com', 'https://bd.winypay.com']:
    for ep in [
        'get_pay_url.php','pay_url.php','payment_link.php','deposit_link.php',
        'deposit_status.php','query.php','status.php','order.php','payin_link.php',
        'get_payment_url.php','redirect_url.php'
    ]:
        for body_obj in [
            {'merchant_code':'M10AAF98','secret_key':secret,'order_id':order_id},
            {'merchant_code':'M10AAF98','secret_key':secret,'internal_txn_id':internal},
            {'merchant_code':'M10AAF98','secret_key':secret,'order_id':order_id,'internal_txn_id':internal},
            {'merchant_code':'M10AAF98','secret_key':secret,'transaction_id':internal},
        ]:
            body = json.dumps(body_obj).replace('"','\\"')
            cmd = f'curl -sS -m 10 -X POST "{base}/api/merchant/payin/{ep}" -H "Content-Type: application/json" -d "{body}"'
            _,o,_=c.exec_command(cmd, timeout=15)
            out=o.read().decode().strip()
            if out and '404' not in out[:80] and '<!DOCTYPE' not in out and 'Not Found' not in out:
                if 'pay_url' in out or 'token' in out or out.startswith('{'):
                    print(base, ep, body_obj, '=>', out[:300])
c.close()
