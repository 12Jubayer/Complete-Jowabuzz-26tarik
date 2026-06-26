#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
DST=$(grep ORACLE_GAMES_DST_GAME_KEY= /www/wwwroot/jowabuzz/backend/.env | cut -d= -f2)
for path in /api/providerlist /api/game/JDB; do
  echo "=== GET $path x-oracle-key ==="
  curl -sk "https://oraclegames.net$path" -H "x-oracle-key: $DST" | head -c 2500
  echo
done
echo "=== POST getgames x-oracle-key ==="
curl -sk -X POST "https://oraclegames.net/api/getgames" \
  -H "Content-Type: application/json" -H "x-oracle-key: $DST" \
  -d '{"game_uid":["4eef5090166a6889956a630321713366"]}' | head -c 2500
echo
'''
_, o, _ = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
