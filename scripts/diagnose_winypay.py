#!/usr/bin/env python3
"""Diagnose WinyPay payment gateway on production (read-only + safe provider fix)."""
import json
import re
import sys
import time

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)

def run(cmd, timeout=60):
    print('\n$ ' + cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print('stderr:', err.rstrip())
    return out


# 1) Env keys (masked)
run("grep '^WINYPAY_' /www/wwwroot/jowabuzz/backend/.env | sed 's/\\(SECRET\\|PAYOUT\\)_KEY=.*/\\1_KEY=***set***/'")

# 2) site_settings payment gateway
run(
    "mysql -u root -N -e "
    "\"SELECT setting_value FROM jowabuzz.site_settings WHERE setting_key='general_payment_gateway' LIMIT 1\""
)

# 3) winypay log tail
run('tail -n 30 /www/wwwroot/jowabuzz/backend/logs/winypay.log 2>/dev/null || echo "(no winypay log yet)"')

# 4) Node quick config + live deposit ping test on server
node_diag = r'''
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const { getWinypayConfig, isWinypayConfigured } = await import('./services/winypayService.js');
const { getGeneralPaymentGatewaySettings } = await import('./services/generalSettingsService.js');

const gw = await getGeneralPaymentGatewaySettings();
const cfg = getWinypayConfig();
console.log('gateway_settings:', JSON.stringify(gw));
console.log('winypay_configured:', isWinypayConfigured());
console.log('deposit_endpoint:', cfg.depositEndpoint);
console.log('merchant:', cfg.merchantCode);

const testOrder = `DEP-test-${Date.now()}`;
const payload = {
  merchant_code: cfg.merchantCode,
  secret_key: cfg.secretKey,
  order_id: testOrder,
  user_id: '1',
  amount: '100.00',
  pay_type: 'bkash',
  current_time: new Date().toISOString().slice(0,19).replace('T',' '),
  jump_url: cfg.jumpUrl,
  callback_url: cfg.depositCallbackUrl,
};

try {
  const res = await fetch(cfg.depositEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log('api_http_status:', res.status);
  console.log('api_response:', text.slice(0, 500));
} catch (e) {
  console.log('api_fetch_error:', e.message);
}
'''.replace('\n', ' ')

run(f'cd {REMOTE}/backend && node --input-type=module -e "{node_diag}"', timeout=90)

client.close()
