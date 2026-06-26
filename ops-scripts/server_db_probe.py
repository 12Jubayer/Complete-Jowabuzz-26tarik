import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "cd /www/wwwroot/jowabuzz/backend && node -e \"import('dotenv/config'); import {connectDatabase} from './config/db.js'; await connectDatabase(); const p=(await import('./config/db.js')).getPool(); const [[g]]=await p.query('SELECT COUNT(*) c FROM games'); const [[pr]]=await p.query('SELECT COUNT(*) c FROM providers'); const [[o]]=await p.query(\\\"SELECT COUNT(*) c FROM providers WHERE adapter_key='oracle'\\\"); const [[og]]=await p.query(\\\"SELECT COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.adapter_key='oracle'\\\"); console.log(JSON.stringify({games:g.c,providers:pr.c,oracleProviders:o.c,oracleGames:og.c})); process.exit(0);\"",
    "ls -la /www/wwwroot/jowabuzz/backend/backups/ 2>/dev/null | tail -5",
    "grep -E 'HMK_|ORACLE_' /www/wwwroot/jowabuzz/backend/.env | grep -v SECRET | grep -v TOKEN | grep -v KEY",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd, timeout=60000)
    print('---')
    print(o.read().decode('utf-8','replace'))
    err = e.read().decode('utf-8','replace')
    if err.strip(): print('ERR', err[:300])
c.close()
