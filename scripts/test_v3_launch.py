#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
DST=$(grep ORACLE_GAMES_DST_GAME_KEY= /www/wwwroot/jowabuzz/backend/.env | cut -d= -f2)
BODY='{"amount":"100","username":"testuser","game_uid":"4eef5090166a6889956a630321713366"}'
for URL in \
  "https://oraclegames.net/api/getgameurl" \
  "https://crazybet99.com/getgameurl/v3" \
  "https://crazybet99.com/api/getgameurl" \
  "https://oraclegames.net/getgameurl/v3"
do
  echo "=== POST $URL ==="
  curl -sk -X POST "$URL" -H "Content-Type: application/json" -H "x-oracle-key: $DST" -d "$BODY" | head -c 800
  echo
done
'''
_, o, _ = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
