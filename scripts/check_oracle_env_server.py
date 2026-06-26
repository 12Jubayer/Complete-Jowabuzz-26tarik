#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
for cmd in [
    'grep -E "ORACLE_GAMING|ORACLE_GAMES_V3|ORACLE_GAMES_API_VERSION|CALLBACK" /www/wwwroot/jowabuzz/backend/.env',
    'cd /www/wwwroot/jowabuzz/backend && node --input-type=module --eval "import dotenv/config; import { resolveOracleGamingCredentials } from \'./services/oracleGamingApiService.js\'; console.log(JSON.stringify(resolveOracleGamingCredentials()));"'
]:
    print('===', cmd[:80])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode())
    err = e.read().decode()
    if err.strip(): print('err', err[:300])
c.close()
