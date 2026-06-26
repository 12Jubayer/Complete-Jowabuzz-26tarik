#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
for var in ORACLE_GAMES_API_KEY ORACLE_GAMES_DST_GAME_KEY ORACLE_GAMES_DST_KEY ORACLE_GAMES_WEBHOOK_SECRET ORACLE_GAMES_SECRET_KEY; do
  val=$(eval echo \$$var)
  echo "=== providerlist $var (${#val} chars) ==="
  curl -sk "https://oraclegames.net/api/providerlist" -H "x-oraclegamedata-key: $val" | head -c 300
  echo
done
'''
_, o, _ = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
c.close()
