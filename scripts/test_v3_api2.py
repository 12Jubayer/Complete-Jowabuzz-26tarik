#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
echo "=== providerlist API_KEY as data key ==="
curl -sk "https://oraclegames.net/api/providerlist" -H "x-oraclegamedata-key: $ORACLE_GAMES_API_KEY" | head -c 1500
echo
echo "=== providerlist DST as data key ==="
curl -sk "https://oraclegames.net/api/providerlist" -H "x-oraclegamedata-key: $ORACLE_GAMES_DST_GAME_KEY" | head -c 1500
echo
echo "=== launch valid username ==="
curl -sk -X POST "https://oraclegames.net/api/getgameurl" \
  -H "Content-Type: application/json" -H "x-oracle-key: $ORACLE_GAMES_DST_GAME_KEY" \
  -d '{"amount":"100","username":"abcdefghjk","game_uid":"4eef5090166a6889956a630321713366"}' | head -c 1500
echo
'''
_, o, _ = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
