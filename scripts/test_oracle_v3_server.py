#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
script = r'''
KEY="0a4c40469ec03dd868299c098da91c6b"
echo "=== providerlist ==="
curl -sk "https://oraclegames.net/api/providerlist" -H "x-oraclegamedata-key: $KEY" | head -c 2000
echo
echo "=== providerlist x-oracle-key ==="
curl -sk "https://oraclegames.net/api/providerlist" -H "x-oracle-key: $KEY" | head -c 2000
echo
echo "=== game JDB ==="
curl -sk "https://oraclegames.net/api/game/JDB" -H "x-oraclegamedata-key: $KEY" | head -c 2000
echo
echo "=== env oracle ==="
grep -i oracle /www/wwwroot/jowabuzz/backend/.env 2>/dev/null | sed 's/=.*/=***MASKED***/'
'''

c = paramiko.SSHClient()
c.set_missing_hostKey_policy = c.set_missing_host_key_policy
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
_, o, e = c.exec_command(script, timeout=60)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace'))
c.close()
