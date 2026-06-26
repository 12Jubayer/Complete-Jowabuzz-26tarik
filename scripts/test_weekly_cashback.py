#!/usr/bin/env python3
import sys, paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60)
cmd = """
curl -s -o /dev/null -w 'run-now HTTP:%{http_code}\\n' -X POST http://127.0.0.1:3001/api/admin/weekly-cashback/run-now
curl -s http://127.0.0.1:3001/api/admin/weekly-cashback | head -c 200
echo
pm2 logs jowabuzz --lines 20 --nostream 2>/dev/null | grep -i WeeklyCashback || true
mysql -uroot -p656940d50e847e3f jowabuzz -e "SELECT enabled,day_of_week,hour_utc,last_run_at,last_run_credited,last_run_skipped FROM weekly_cashback_settings LIMIT 1;"
"""
_, o, _ = c.exec_command(cmd, timeout=30)
print(o.read().decode())
c.close()
