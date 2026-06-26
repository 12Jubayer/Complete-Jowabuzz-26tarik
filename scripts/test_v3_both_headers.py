#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
DST=$(grep ORACLE_GAMES_DST_GAME_KEY= /www/wwwroot/jowabuzz/backend/.env | cut -d= -f2)
curl -sk "https://oraclegames.net/api/providerlist" \
  -H "x-oraclegamedata-key: $DST" -H "x-oracle-key: $DST" | head -c 500
echo
curl -sk "https://oraclegames.net/api/game/JDB" \
  -H "x-oraclegamedata-key: $DST" -H "x-oracle-key: $DST" | head -c 2000
echo
'''
_, o, _ = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
