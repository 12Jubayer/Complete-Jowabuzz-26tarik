#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = (
    'cd /www/wwwroot/jowabuzz/backend && node --input-type=module --eval '
    '"import \'dotenv/config\'; '
    "import { connectDatabase } from './config/db.js'; "
    "import { syncGamesFromOracle } from './services/gameCatalogService.js'; "
    'await connectDatabase(); '
    'const r = await syncGamesFromOracle(); '
    'console.log(JSON.stringify(r));"'
)
_, o, e = c.exec_command(cmd, timeout=600000)
print(o.read().decode())
err = e.read().decode()
if err.strip():
    print('stderr:', err[:1200])
c.close()
