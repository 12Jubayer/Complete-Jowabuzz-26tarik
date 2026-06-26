#!/usr/bin/env python3
import sys
import paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -E 'PAYMENT_GATEWAY_PROVIDER|WINYPAY_MERCHANT' /www/wwwroot/jowabuzz/backend/.env",
    "cd /www/wwwroot/jowabuzz/backend && node -e \"import('dotenv').then(d=>{d.config(); return import('./services/generalSettingsService.js')}).then(m=>m.getGeneralPaymentGatewaySettings()).then(s=>console.log(JSON.stringify(s))).catch(e=>console.error(e))\"",
    "curl -s http://127.0.0.1:3001/api/health",
]
for cmd in cmds:
    print('---', cmd[:80])
    _, o, e = c.exec_command(cmd, timeout=45)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip():
        print('err:', err)
c.close()
