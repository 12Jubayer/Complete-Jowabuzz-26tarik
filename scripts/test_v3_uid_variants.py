#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
for uid in "77" "gpas_1reeler_pop" "KYS-H5-99999"; do
  echo "=== uid: $uid ==="
  curl -sk --max-time 15 -X POST https://oraclegames.net/api/getgameurl \
    -H "Content-Type: application/json" -H "x-oracle-key: $ORACLE_GAMES_DST_GAME_KEY" \
    -d "{\"amount\":\"100\",\"username\":\"abcdefghij\",\"game_uid\":\"$uid\"}"
  echo
done
'''
_, o, _ = c.exec_command(script, timeout=60000)
print(o.read().decode('utf-8', 'replace'))
c.close()
