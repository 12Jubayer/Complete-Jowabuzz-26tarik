#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sql = "SELECT g.code, g.name, p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.status='active' LIMIT 10"
cmd = f'''cd /www/wwwroot/jowabuzz/backend && node --input-type=module --eval "import 'dotenv/config';import {{getPool}} from './config/db.js';const db=await getPool();const [rows]=await db.query('{sql}');console.log(JSON.stringify(rows,null,2));process.exit(0);"'''
_, o, e = c.exec_command(cmd, timeout=60)
print(o.read().decode())
print(e.read().decode()[:400])
c.close()
