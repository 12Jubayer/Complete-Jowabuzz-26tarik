import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("cat /www/wwwroot/jowabuzz/backend/logs/winypay.log")
lines = o.read().decode('utf-8', errors='replace').strip().split('\n')
# show last 30 entries with request+response pairs
for line in lines[-40:]:
    try:
        d = json.loads(line)
        if d.get('event') == 'api_request':
            p = d.get('payload', {})
            print('REQ', d['timestamp'][:19], 'order', p.get('order_id'), 'pay_type', p.get('pay_type'), 'amount', p.get('amount'))
        elif d.get('event') == 'api_response':
            data = d.get('data', {})
            print('RES', d['timestamp'][:19], 'pay_url', (data.get('pay_url') or '')[:60], 'order', data.get('order_id'))
    except:
        print(line[:120])
# check env and recent pm2 restarts
for cmd in [
    "grep WINYPAY /www/wwwroot/jowabuzz/backend/.env | sed 's/SECRET=.*/SECRET=***/;s/PAYOUT=.*/PAYOUT=***/'",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id,order_id,pay_url,status,created_at FROM winypay_payment_orders ORDER BY id DESC LIMIT 10\"",
    "grep -n 'channel' /www/wwwroot/jowabuzz/backend/services/winypayService.js",
]:
    _,o,_=c.exec_command(cmd)
    print('===', cmd[:50])
    print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
