#!/usr/bin/env python3
"""Integration tests for Oracle V3 on production server."""
import json
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'

TEST_SCRIPT = r'''
set -a
source /www/wwwroot/jowabuzz/backend/.env
set +a
sleep 3
echo "=== Health ==="
curl -sk -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health
echo
echo "=== API Version env ==="
grep ORACLE_GAMES_API_VERSION /www/wwwroot/jowabuzz/backend/.env
grep ORACLE_GAMES_V3 /www/wwwroot/jowabuzz/backend/.env | sed 's/=.*/=***/'
echo "=== V3 Launch Test ==="
curl -sk -X POST https://oraclegames.net/api/getgameurl \
  -H "Content-Type: application/json" -H "x-oracle-key: $ORACLE_GAMES_V3_LAUNCH_KEY" \
  -d '{"amount":"100","username":"abcdefghij","game_uid":"'"$ORACLE_GAMES_V3_TEST_GAME_UID"'"}'
echo
echo "=== Admin test connection (local) ==="
node --input-type=module <<'NODE'
import { testGamingGatewayConnection } from '/www/wwwroot/jowabuzz/backend/services/gamingGatewayService.js';
const result = await testGamingGatewayConnection();
console.log(JSON.stringify(result, null, 2));
NODE
'''

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
_, o, e = c.exec_command(TEST_SCRIPT, timeout=120)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('STDERR:', err)
c.close()
