#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
KEY="$ORACLE_GAMES_DST_GAME_KEY"
curl -sk --max-time 25 -X POST "https://crazybet99.com/getgameurl/v2" \
  -H "Content-Type: application/json" -H "x-dstgame-key: $KEY" \
  -d '{"username":"01700000000","money":100,"provider_code":"JILIS","game_code":"77","game_type":"SLOT","callback_url":"https://jowabuzz.com/api/oracle/callback"}'
echo
curl -sk -o /dev/null -w "health:%{http_code}\n" http://127.0.0.1:3001/api/health
'''
_, o, _ = c.exec_command(script, timeout=45000)
print(o.read().decode('utf-8', 'replace'))
c.close()
