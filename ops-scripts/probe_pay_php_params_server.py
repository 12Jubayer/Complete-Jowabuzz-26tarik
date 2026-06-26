import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
order='DEP-1782235988209-38'
internal='DEP202606232332385372'
merchant='M10AAF98'
queries = [
    f'token={internal}',
    f'order_id={order}',
    f'order={order}',
    f'id={internal}',
    f'txn={internal}',
    f'internal_txn_id={internal}',
    f'order_id={order}&merchant_code={merchant}',
    f'order_id={order}&internal_txn_id={internal}',
    f'ref={internal}',
]
for q in queries:
    for base in ['https://bd.winypay.com/pay.php', 'https://bd.gopostman.com/pay.php']:
        url=f'{base}?{q}'
        _,o,_=c.exec_command(f"curl -sS -o /dev/null -w '%{{http_code}}' -L --max-time 10 '{url}'")
        code=o.read().decode().strip()
        if code not in ('404','410','000'):
            print(code, url)
c.close()
