#!/usr/bin/env python3
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = """
curl -s http://127.0.0.1:3001/api/public/favourite-sliders
echo
mysql -uroot -p656940d50e847e3f jowabuzz -e "SHOW TABLES LIKE 'favourite_sliders'; SELECT COUNT(*) AS cnt FROM favourite_sliders;"
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60)
_, o, _ = c.exec_command(REMOTE, timeout=30)
print(o.read().decode())
c.close()
