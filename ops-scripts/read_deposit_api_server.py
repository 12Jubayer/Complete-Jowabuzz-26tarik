import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "sed -n '392,470p' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js",
    "sed -n '120,220p' /www/wwwroot/jowabuzz/backend/services/winypayService.js",
    "grep -rn 'submitDepositRequest' /www/wwwroot/jowabuzz/frontend/src | head -10",
    "grep -rn 'submitDepositRequest\\|deposit.*request' /www/wwwroot/jowabuzz/frontend/src/services /www/wwwroot/jowabuzz/frontend/src/api 2>/dev/null | head -20",
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd)
    out=o.read().decode('utf-8', errors='replace')
    print('===', cmd[:70])
    print(out.encode('ascii', errors='replace').decode())
c.close()
