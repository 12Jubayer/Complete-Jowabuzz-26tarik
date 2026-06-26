import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SHOW TABLES LIKE '%setting%';\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM site_settings WHERE setting_key LIKE '%turnover%' OR setting_key LIKE '%withdraw%' LIMIT 20;\" 2>/dev/null",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id, config_key, config_value FROM general_settings LIMIT 5;\" 2>/dev/null",
    "grep -n 'getWithdrawTurnoverSettings\\|requireTurnover\\|requireBonus' /www/wwwroot/jowabuzz/backend/services/generalSettingsService.js | head -30",
]
for cmd in cmds:
    print('===', cmd[:75])
    _,o,e=c.exec_command(cmd)
    print(o.read().decode())
    err=e.read().decode()
    if err and 'ERROR' in err: print('ERR', err[:200])
c.close()
