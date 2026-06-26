#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = (
    'cd /www/wwwroot/jowabuzz/backend && node --input-type=module -e '
    '"import \'dotenv/config\';'
    'import { getPool } from \'./config/db.js\';'
    'import { getGamingGatewaySettingsInternal } from \'./services/gamingGatewayService.js\';'
    'import { getProviderByCode } from \'./services/oracleGamingApiService.js\';'
    'const pool=getPool();'
    'const [[b]]=await pool.query(`SELECT g.id,g.code,g.name,p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name=\'Boxing King\' LIMIT 1`);'
    'console.log(\'BOXING\',JSON.stringify(b));'
    'const s=await getGamingGatewaySettingsInternal();'
    'const r=await getProviderByCode(s,\'JILI\');'
    'const m=(r.games||[]).find(g=>/boxing king/i.test(g.name));'
    'console.log(\'ORACLE_MATCH\',JSON.stringify(m));'
    'process.exit(0);"'
)
_, o, e = c.exec_command(cmd, timeout=120000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR', err[:800])
c.close()
