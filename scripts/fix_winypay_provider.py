#!/usr/bin/env python3
import sys
import time
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'

FIX_SCRIPT = '''import dotenv from 'dotenv';
dotenv.config();

const { connectDatabase } = await import('./config/db.js');
const { getGeneralPaymentGatewaySettings, saveGeneralPaymentGatewaySettings } = await import('./services/generalSettingsService.js');
const { getWinypayConfig, isWinypayConfigured } = await import('./services/winypayService.js');

await connectDatabase();

const before = await getGeneralPaymentGatewaySettings();
console.log('BEFORE:', JSON.stringify(before));

if (before.provider !== 'winypay') {
  await saveGeneralPaymentGatewaySettings({ provider: 'winypay', apiKey: before.apiKey || '' });
  console.log('UPDATED provider to winypay in site_settings');
}

const after = await getGeneralPaymentGatewaySettings();
console.log('AFTER:', JSON.stringify(after));
console.log('WINYPAY_CONFIGURED:', isWinypayConfigured());
console.log('ENV_PROVIDER:', process.env.PAYMENT_GATEWAY_PROVIDER || '(not set)');

const cfg = getWinypayConfig();
const testOrder = 'DEP-diag-' + Date.now();
const payload = {
  merchant_code: cfg.merchantCode,
  secret_key: cfg.secretKey,
  order_id: testOrder,
  user_id: '1',
  amount: '100.00',
  pay_type: 'bkash',
  current_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
  jump_url: cfg.jumpUrl,
  callback_url: cfg.depositCallbackUrl,
};

const res = await fetch(cfg.depositEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log('API_STATUS:', res.status);
console.log('API_BODY:', text.slice(0, 800));
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = client.open_sftp()

# upload paymentGatewayConfig.js
local_cfg = r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main\backend\services\paymentGatewayConfig.js'
sftp.put(local_cfg, f'{REMOTE}/backend/services/paymentGatewayConfig.js')
print('uploaded paymentGatewayConfig.js')

with sftp.open(f'{REMOTE}/backend/fix_winypay_run.mjs', 'w') as f:
    f.write(FIX_SCRIPT)
sftp.close()

_, stdout, stderr = client.exec_command(f'cd {REMOTE}/backend && node fix_winypay_run.mjs', timeout=90)
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err.strip():
    print('stderr:', err)

client.exec_command('rm -f /www/wwwroot/jowabuzz/backend/fix_winypay_run.mjs', timeout=10)
client.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
time.sleep(3)
_, stdout, _ = client.exec_command('curl -s http://127.0.0.1:3001/api/health', timeout=15)
print('health:', stdout.read().decode())
client.close()
