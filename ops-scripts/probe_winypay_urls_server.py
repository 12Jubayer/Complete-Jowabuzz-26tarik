import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
txn = 'DEP202606232321285196'
urls = [
    f'https://bd.winypay.com/pay.php?txn={txn}',
    f'https://bd.winypay.com/pay.php?order_id={txn}',
    f'https://bd.winypay.com/pay.php?id={txn}',
    f'https://bd.winypay.com/pay.php?internal_txn_id={txn}',
    f'https://bd.winypay.com/pay.php?transaction_id={txn}',
    'https://bd.winypay.com/pay.php',
]
for u in urls:
    cmd = f"curl -sS -o /dev/null -w '%{{http_code}} %{{url_effective}}' -L --max-time 15 '{u}'"
    _,o,_=c.exec_command(cmd)
    print(o.read().decode())
# try query status endpoints
for ep in [
    'https://bd.gopostman.com/api/merchant/payin/status.php',
    'https://bd.gopostman.com/api/merchant/payin/query.php',
    'https://bd.gopostman.com/api/merchant/payin/deposit_status.php',
]:
    cmd = f"""bash -lc 'export $(grep -v "^#" /www/wwwroot/jowabuzz/backend/.env | xargs); curl -sS -X POST "{ep}" -H "Content-Type: application/json" -d "{{\\\"merchant_code\\\":\\\"$WINYPAY_MERCHANT_CODE\\\",\\\"secret_key\\\":\\\"$WINYPAY_SECRET_KEY\\\",\\\"order_id\\\":\\\"DEP-1782234483163-67\\\",\\\"internal_txn_id\\\":\\\"{txn}\\\"}}" -w "\\nHTTP:%{{http_code}}" --max-time 15' """
    _,o,_=c.exec_command(cmd, timeout=30)
    print('EP', ep, o.read().decode()[:300])
c.close()
