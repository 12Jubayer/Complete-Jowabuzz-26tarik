import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
cd /www/wwwroot/jowabuzz/backend
node -e "
import('dotenv/config');
import { initiateWinypayDeposit } from './services/winypayService.js';
const r = await initiateWinypayDeposit({ userId: 999, amount: 100, method: 'bkash', transactionId: 999999 });
console.log(JSON.stringify(r, null, 2));
" 2>&1
'''
_,o,e=c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', errors='replace'))
print(e.read().decode('utf-8', errors='replace'))
c.close()
