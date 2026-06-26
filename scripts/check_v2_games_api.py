#!/usr/bin/env python3
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
curl -sk --max-time 20 "https://api.oraclegames.live/api/games?limit=3&page=1" -H "x-api-key: $ORACLE_GAMES_API_KEY" | head -c 2500
echo
echo "--- V3 launch sample ---"
curl -sk --max-time 20 -X POST https://oraclegames.net/api/getgameurl \
  -H "Content-Type: application/json" -H "x-oracle-key: $ORACLE_GAMES_DST_GAME_KEY" \
  -d '{"amount":"100","username":"abcdefghij","game_uid":"4eef5090166a6889956a630321713366"}'
'''
_, o, _ = c.exec_command(script, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
c.close()
