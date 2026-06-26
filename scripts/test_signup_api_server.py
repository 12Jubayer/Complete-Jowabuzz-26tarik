#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CMD = r"""
curl -s -X POST http://127.0.0.1:3001/api/affiliate/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"TestAffInvalid","phone":"01999999001","email":"testinvalid001@test.com","password":"test123","settlementUserId":"999999999"}'
echo
curl -s -X POST http://127.0.0.1:3001/api/affiliate/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"TestAffValid","phone":"01999999002","email":"testvalid002@test.com","password":"test123","settlementUserId":"20"}'
echo
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
_, o, e = c.exec_command(CMD, timeout=60)
print(o.read().decode('utf-8', errors='replace'))
c.close()
