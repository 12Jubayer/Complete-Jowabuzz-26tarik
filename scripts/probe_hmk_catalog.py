#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

script = r'''set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
BASE="${HMK_API_URL:-https://767fafapi.live/api/v1}"
TOKEN="$HMK_TOKEN"
for path in \
  "/game/list" \
  "/game/games" \
  "/game/games.php" \
  "/api/game/list" \
  "/provider/list" \
  "/providerlist" \
  ""; do
  echo "=== GET ${BASE}${path} ==="
  curl -sk "${BASE}${path}?token=${TOKEN}" | head -c 600
  echo
done
'''

_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:500])
c.close()
