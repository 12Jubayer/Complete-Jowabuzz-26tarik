import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
# brute common payin endpoints
endpoints = [
    'deposit.php','deposit_link.php','get_pay_url.php','pay_url.php','payment_link.php',
    'create_deposit.php','initiate.php','order.php','payin.php','payin_link.php'
]
base='https://bd.gopostman.com/api/merchant/payin'
for ep in endpoints:
    url=f'{base}/{ep}'
    cmd=rf'''bash -lc 'export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); curl -sS -o /dev/null -w "%{{http_code}}" -X POST "{url}" -H "Content-Type: application/json" -d "{{\"merchant_code\":\"$WINYPAY_MERCHANT_CODE\",\"secret_key\":\"$WINYPAY_SECRET_KEY\",\"order_id\":\"DEP-PROBE-999\",\"internal_txn_id\":\"DEP202606232326258404\"}}" --max-time 10' '''
    _,o,_=c.exec_command(cmd, timeout=20)
    code=o.read().decode().strip()
    if code not in ('404','000'):
        print(ep, code)
# check pm2 logs around 17:00
_,o,_=c.exec_command("grep -i 'winypay\\|deposit\\|gateway' /root/.pm2/logs/jowabuzz-out.log 2>/dev/null | tail -30")
print('PM2:', o.read().decode('utf-8', errors='replace')[-2000:].encode('ascii', errors='replace').decode())
c.close()
