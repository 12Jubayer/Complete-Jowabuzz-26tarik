#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
script = r'''
set -a
source /www/wwwroot/jowabuzz/backend/.env 2>/dev/null
set +a
echo "API_KEY=${ORACLE_GAMES_API_KEY:0:8}..."
echo "DST_KEY=${ORACLE_GAMES_DST_GAME_KEY:0:8}..."
for KEY in "$ORACLE_GAMES_API_KEY" "$ORACLE_GAMES_DST_GAME_KEY" "0a4c40469ec03dd868299c098da91c6b"; do
  echo "--- testing key ${KEY:0:8}... with x-oraclegamedata-key ---"
  curl -sk "https://oraclegames.net/api/providerlist" -H "x-oraclegamedata-key: $KEY" | head -c 500
  echo
done
echo "--- V2 providers with api key ---"
curl -sk "https://api.oraclegames.live/api/providers" -H "x-api-key: $ORACLE_GAMES_API_KEY" | head -c 500
echo
'''

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
_, o, e = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
