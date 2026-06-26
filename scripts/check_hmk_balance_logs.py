#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

script = r'''cd /www/wwwroot/jowabuzz/backend && node --input-type=module <<'NODEEOF'
import 'dotenv/config';
import { getPool } from './config/db.js';

const pool = getPool();
const [rows] = await pool.query(
  `SELECT id, user_id, game_round, bet_amount, win_amount, balance_before, balance_after, status, created_at
   FROM hmk_game_transactions
   ORDER BY id DESC LIMIT 15`
);
console.log(JSON.stringify(rows, null, 2));

const [logs] = await pool.query(
  `SELECT user_id, endpoint, status_code, created_at,
          JSON_EXTRACT(response_payload, '$.balance') AS resp_balance
   FROM api_logs
   WHERE endpoint LIKE '%game%' OR endpoint LIKE '%hmk%'
   ORDER BY id DESC LIMIT 10`
).catch(() => [[]]);
console.log('API_LOGS', JSON.stringify(logs, null, 2));
process.exit(0);
NODEEOF
'''

_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR', err[:1000])
c.close()
