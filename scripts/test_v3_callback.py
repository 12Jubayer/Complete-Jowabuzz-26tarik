#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
cd /www/wwwroot/jowabuzz/backend
node --input-type=module <<'NODE'
import { buildOracleV3LaunchUsername } from './services/oracleGamesV3ApiClient.js';
const userId = 38;
console.log('V3 username for user', userId, '=', buildOracleV3LaunchUsername(userId));
NODE

UID=38
UNAME=$(cd /www/wwwroot/jowabuzz/backend && node --input-type=module -e "import { buildOracleV3LaunchUsername } from './services/oracleGamesV3ApiClient.js'; console.log(buildOracleV3LaunchUsername(38));")
echo "Username: $UNAME"
SERIAL="v3test-$(date +%s)"
PAYLOAD=$(cat <<EOF
{"game_uid":"4eef5090166a6889956a630321713366","game_round":"17906742614655712593","bet_amount":"5","serial_number":"$SERIAL","win_amount":"0","member_account":"$UNAME","currency_code":"BDT","timestamp":"2026-06-18 12:00:00"}
EOF
)
echo "Payload: $PAYLOAD"
curl -sk -X POST http://127.0.0.1:3001/api/oracle/callback -H "Content-Type: application/json" -d "$PAYLOAD"
echo
'''
_, o, e = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
