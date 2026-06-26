import paramiko
import json

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -u root -pbangla12@ jowabuzz -N -e \"SELECT g.id,g.code,g.name,p.code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.is_hot=1 AND g.status='active' LIMIT 15\"",
    "grep -n 'buildHmkLaunchUidCandidates\\|isOracleOnlyUid\\|lookupCatalogGameUid' /www/wwwroot/jowabuzz/backend/services/hmkApiService.js | head -20",
    "tail -80 /root/.pm2/logs/jowabuzz-out.log 2>/dev/null | grep -i 'launch\\|HMK\\|Game Start' | tail -25",
]

for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip():
        print('ERR:', err[:300])
c.close()
