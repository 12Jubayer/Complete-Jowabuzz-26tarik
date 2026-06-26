import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM transactions WHERE id=123\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT * FROM deposit_requests WHERE transaction_id=123\"",
    "grep -n 'assertNotWinypayPendingForManualApproval\\|approveDepositTransaction' /www/wwwroot/jowabuzz/backend/controllers/adminDepositController.js",
    "tail -100 /www/wwwroot/jowabuzz/backend/logs/winypay.log 2>/dev/null || tail -100 /www/wwwroot/jowabuzz/backend/logs/*.log 2>/dev/null | grep -i winypay | tail -30",
]
for cmd in cmds:
    print('===', cmd[:80])
    _,o,_=c.exec_command(cmd,timeout=30)
    print(o.read().decode('utf-8','replace')[:3000])
c.close()
