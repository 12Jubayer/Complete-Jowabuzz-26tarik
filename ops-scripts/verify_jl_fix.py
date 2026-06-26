import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/games?category=slots&provider=JL&limit=200' | python3 -c \"import sys,json;d=json.load(sys.stdin);print('JL games',len(d.get('data',[])))\"", timeout=30)
print(o.read().decode('utf-8','replace'))
_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=slot' | python3 -c \"import sys,json;d=json.load(sys.stdin);codes=[x['code'] for x in d.get('data',[])];print('providers',len(codes),'JL' in codes, 'JILI' in codes)\"", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
