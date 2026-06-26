#!/usr/bin/env python3
import sys, paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
node = r'''
import dotenv from "dotenv";
dotenv.config();
import { connectDatabase, getPool } from "./config/db.js";
await connectDatabase();
const pool = getPool();
const [methods] = await pool.query("SELECT id,name,is_active FROM payment_methods ORDER BY sort_order");
console.log("payment_methods:", JSON.stringify(methods));
const [gw] = await pool.query("SELECT setting_value FROM site_settings WHERE setting_key='general_payment_gateway'");
console.log("gateway_db:", gw[0]?.setting_value);
'''
sftp = c.open_sftp()
with sftp.open('/www/wwwroot/jowabuzz/backend/_chk.mjs','w') as f: f.write(node)
sftp.close()
_,o,e=c.exec_command('cd /www/wwwroot/jowabuzz/backend && node _chk.mjs', timeout=30)
print(o.read().decode())
c.exec_command('rm -f /www/wwwroot/jowabuzz/backend/_chk.mjs')
# check frontend deposit page for payUrl
_,o,_=c.exec_command('grep -n payUrl /www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileDepositPage.jsx | head -5', timeout=15)
print('frontend payUrl:', o.read().decode())
# check built assets age
_,o,_=c.exec_command('ls -la /www/wwwroot/jowabuzz/frontend/dist/assets/index-*.js | tail -1', timeout=15)
print('dist:', o.read().decode())
c.close()
