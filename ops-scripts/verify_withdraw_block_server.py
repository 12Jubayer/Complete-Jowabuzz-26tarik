import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "test -f /www/wwwroot/jowabuzz/frontend/dist/index.html && echo BUILD_OK || echo BUILD_FAIL",
    "grep -o 'withdrawBlocked\\|bonusTurnoverIncomplete' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>/dev/null | head -3 || echo NO_MINIFIED_MATCH",
    "grep -n 'enforceBonusTurnoverForWithdraw(userId)' /www/wwwroot/jowabuzz/backend/controllers/userWithdrawOtpController.js | head -5",
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT setting_value FROM site_settings WHERE setting_key='general_deposit_withdraw'\"",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    out = o.read().decode('utf-8', errors='replace')
    print(out.encode('ascii', errors='replace').decode())
c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
c.close()
print('pm2 restarted')
