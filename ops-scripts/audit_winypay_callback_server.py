import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep WINYPAY /www/wwwroot/jowabuzz/backend/.env | grep -v SECRET | grep -v PAYOUT",
    "grep -n 'depositApiBaseUrl\\|depositEndpoint\\|deposit-callback' /www/wwwroot/jowabuzz/backend/services/winypayService.js | head -15",
    "tail -30 /www/wwwroot/jowabuzz/backend/logs/winypay.log",
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT w.id, w.order_id, w.status, w.pay_url IS NOT NULL AS has_pay_url,
       t.status AS txn_status, t.amount, w.created_at
FROM winypay_payment_orders w
JOIN transactions t ON t.id = w.transaction_id
ORDER BY w.id DESC LIMIT 8" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT COUNT(*) FROM winypay_payment_orders WHERE status='success'" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT COUNT(*) FROM winypay_payment_orders WHERE status='awaiting_callback'" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT COUNT(*) FROM winypay_payment_orders WHERE status='failed'" """,
    "grep -i 'callback\\|winypay' /root/.pm2/logs/jowabuzz-error.log 2>/dev/null | tail -15",
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd, timeout=45)
    out=o.read().decode('utf-8', errors='replace')
    print('===', cmd[:60].replace('\n',' '))
    print(out.encode('ascii', errors='replace').decode()[:2500])
c.close()
