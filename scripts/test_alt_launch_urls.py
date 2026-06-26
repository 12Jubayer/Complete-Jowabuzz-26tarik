#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
BODY='{"username":"01700000000","money":100,"provider_code":"JILIS","game_code":"77","game_type":"SLOT","callback_url":"https://jowabuzz.com/api/oracle/callback"}'
for URL in \
  "https://api.oraclegames.live/api/games/launch" \
  "https://oraclegames.net/getgameurl/v2" \
  "https://oraclegames.net/api/games/launch"
do
  echo "=== $URL ==="
  curl -sk --max-time 15 -X POST "$URL" -H "Content-Type: application/json" -H "x-dstgame-key: $ORACLE_GAMES_DST_GAME_KEY" -H "x-oracle-key: $ORACLE_GAMES_DST_GAME_KEY" -d "$BODY" | head -c 400
  echo
done
'''
_, o, _ = c.exec_command(script, timeout=90000)
print(o.read().decode('utf-8', 'replace'))
c.close()
