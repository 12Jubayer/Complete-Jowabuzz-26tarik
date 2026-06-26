#!/usr/bin/env python3
import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
script = '''TOKEN=$(curl -s -X POST http://127.0.0.1:3001/api/admin/login -H 'Content-Type: application/json' -d '{"email":"jowabuzzofficial@gmail.com","password":"112233"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo DELETE:
curl -s -w '\\nHTTP:%{http_code}\\n' -X DELETE http://127.0.0.1:3001/api/admin/players/53 -H "Authorization: Bearer $TOKEN"
echo DB:
mysql -uroot -p656940d50e847e3f jowabuzz -N -e "SELECT COUNT(*) FROM users WHERE id=53 OR name='jb'"
echo RECREATE:
curl -s -w '\\nHTTP:%{http_code}\\n' -X POST http://127.0.0.1:3001/api/admin/players -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"jb","phone":"01900000000","password":"112233","confirmPassword":"112233"}'
'''
sftp = c.open_sftp()
with sftp.file('/tmp/del53.sh','w') as f: f.write(script)
sftp.close()
_, o, _ = c.exec_command('bash /tmp/del53.sh 2>&1', timeout=60)
print(o.read().decode())
c.close()
