import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -n 'bonusProgress\\|requiredTurnover\\|completedTurnover\\|isAggregate' /www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx | head -25",
    "grep -n 'resolvePrimaryDepositBonusProgress\\|depositAmount.toFixed\\|isAggregate' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -20",
    "grep -n 'bonusTurnoverComplete\\|hasLockedDepositBonus' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js",
]
for cmd in cmds:
    print('===', cmd[:70])
    _,o,_=c.exec_command(cmd)
    print(o.read().decode())
c.close()
