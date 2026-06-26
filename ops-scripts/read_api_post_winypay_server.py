import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "sed -n '220,320p' /www/wwwroot/jowabuzz/backend/services/winypayService.js",
    "grep -rn 'apiPost\\|function apiPost' /www/wwwroot/jowabuzz/frontend/src -A 30 | head -80",
    "grep -o 'payUrl\\|pay_url\\|Awaiting provider\\|forwarded successfully' /www/wwwroot/jowabuzz/frontend/dist/assets/*.js | sort | uniq -c",
    "ls -la /www/wwwroot/jowabuzz/frontend/dist/assets/*.js | tail -3",
    "tail -5 /www/wwwroot/jowabuzz/backend/logs/winypay.log",
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd)
    out=o.read().decode('utf-8', errors='replace')
    print('===', cmd[:75])
    print(out.encode('ascii', errors='replace').decode())
c.close()
