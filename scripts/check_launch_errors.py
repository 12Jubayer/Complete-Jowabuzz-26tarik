#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command('grep -i "launch failed\\|Game Start\\|Oracle Launch\\|Oracle V3" /root/.pm2/logs/jowabuzz-error.log | tail -25', timeout=30)
print(o.read().decode('utf-8', 'replace'))
_, o, _ = c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT g.code, p.code AS provider FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.is_active=1 LIMIT 8;\"", timeout=30)
print(o.read().decode('utf-8', 'replace'))
c.close()
