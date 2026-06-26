import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep 'pay_url' /www/wwwroot/jowabuzz/backend/logs/winypay.log | tail -20",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id,name,account_number,channel,is_active FROM payment_methods WHERE is_active=1 ORDER BY id\"",
    "sed -n '1,120p' /www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileDepositPage.jsx",
    "grep -rn 'pay_url\\|payUrl\\|winypay.com' /www/wwwroot/jowabuzz/backend /www/wwwroot/jowabuzz/*.md 2>/dev/null | head -30",
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd)
    out=o.read().decode('utf-8', errors='replace')
    print('===', cmd[:70])
    print(out.encode('ascii', errors='replace').decode())
c.close()
