#!/usr/bin/env python3
import json
import re
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command('cat /www/wwwroot/jowabuzz/backend/.env', timeout=20)
env = o.read().decode('utf-8', errors='replace')

def env_get(key):
    for line in env.splitlines():
        if line.startswith(key + '='):
            return line.split('=', 1)[1].strip()
    return ''

merchant = env_get('WINYPAY_MERCHANT_CODE')
secret = env_get('WINYPAY_SECRET_KEY')
callback = env_get('WINYPAY_DEPOSIT_CALLBACK_URL')
jump = env_get('WINYPAY_JUMP_URL')
base = env_get('WINYPAY_BASE_URL') or 'https://bd.gopostman.com'

payload = {
    'merchant_code': merchant,
    'secret_key': secret,
    'order_id': f'DEP-curltest-{int(__import__("time").time())}',
    'user_id': '1',
    'amount': '100.00',
    'pay_type': 'bkash',
    'current_time': '2026-06-18 12:00:00',
    'jump_url': jump,
    'callback_url': callback,
}
body = json.dumps(payload)

curl = (
    f"curl -sS -m 30 -X POST '{base.rstrip('/')}/api/merchant/payin/deposit.php' "
    f"-H 'Content-Type: application/json' -d '{body}'"
)
print('Testing WinyPay deposit API...')
_, o, e = c.exec_command(curl, timeout=45)
out = o.read().decode('utf-8', errors='replace')
err = e.read().decode('utf-8', errors='replace')
print('RESPONSE:', out[:1000] if out else err)

# Update site_settings provider via node one-liner with connectDatabase
node = r'''
import dotenv from "dotenv";
dotenv.config();
import { connectDatabase, getPool } from "./config/db.js";
import { saveGeneralPaymentGatewaySettings, getGeneralPaymentGatewaySettings } from "./services/generalSettingsService.js";
await connectDatabase();
const s = await getGeneralPaymentGatewaySettings();
if (s.provider !== "winypay") {
  await saveGeneralPaymentGatewaySettings({ provider: "winypay", apiKey: s.apiKey || "" });
  console.log("site_settings updated to winypay");
} else {
  console.log("site_settings already winypay");
}
const after = await getGeneralPaymentGatewaySettings();
console.log("settings:", JSON.stringify(after));
process.exit(0);
'''
sftp = c.open_sftp()
with sftp.open('/www/wwwroot/jowabuzz/backend/_wp_fix.mjs', 'w') as f:
    f.write(node)
sftp.close()
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node _wp_fix.mjs', timeout=60)
print(o.read().decode('utf-8', errors='replace'))
err = e.read().decode('utf-8', errors='replace')
if err.strip():
    print('node err:', err)
c.exec_command('rm -f /www/wwwroot/jowabuzz/backend/_wp_fix.mjs', timeout=10)
c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
c.close()
