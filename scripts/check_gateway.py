import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -E 'ORACLE_|HMK_' /www/wwwroot/jowabuzz/backend/.env | head -20",
    """cd /www/wwwroot/jowabuzz/backend && node -e "
import 'dotenv/config'; import { connectDatabase } from './config/db.js';
import { isGamingGatewayActive, getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
await connectDatabase();
console.log('gateway active', await isGamingGatewayActive());
const s = await getGamingGatewaySettingsInternal();
console.log('status', s.providerStatus, 'apiMode', s.apiMode);
" """,
]
for cmd in cmds:
    print('===', cmd[:60])
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8','replace'))
    err = e.read().decode('utf-8','replace')
    if err.strip(): print('ERR', err[:300])
c.close()
