import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -rn 'Awaiting\\|forwarded\\|payUrl\\|gateway.message' /www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileDepositPage.jsx",
    "grep -rn 'Awaiting\\|forwarded successfully' /www/wwwroot/jowabuzz/frontend/src /www/wwwroot/jowabuzz/backend 2>/dev/null | head -25",
    "grep -rn 'Awaiting\\|forwarded' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>/dev/null | head -5",
    "sed -n '1,80p' /www/wwwroot/jowabuzz/backend/services/paymentGatewayService.js",
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT setting_value FROM site_settings WHERE setting_key='general_payment_gateway'\"",
]
for cmd in cmds:
    _,o,e=c.exec_command(cmd)
    out=o.read().decode('utf-8', errors='replace')
    print('===', cmd[:55])
    print(out[:2000].encode('ascii', errors='replace').decode())
c.close()
