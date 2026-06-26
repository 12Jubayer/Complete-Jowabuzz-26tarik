#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
BODY='{"username":"01700000000","money":100,"provider_code":"JILIS","game_code":"77","game_type":"SLOT","callback_url":"https://jowabuzz.com/api/oracle/callback","operator_id":"'"$ORACLE_GAMES_OPERATOR_ID"'"}'
echo "=== oraclegames.live launch with api-key ==="
curl -sk --max-time 20 -X POST "https://api.oraclegames.live/api/games/launch" \
  -H "Content-Type: application/json" -H "x-api-key: $ORACLE_GAMES_API_KEY" -d "$BODY"
echo
echo "=== crazybet99 v2 ==="
curl -sk --max-time 20 -X POST "https://crazybet99.com/getgameurl/v2" \
  -H "Content-Type: application/json" -H "x-dstgame-key: $ORACLE_GAMES_DST_GAME_KEY" -d "$BODY"
'''
_, o, _ = c.exec_command(script, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
c.close()
