"""Read publicGameProviders and CSS on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "cat /www/wwwroot/jowabuzz/frontend/src/data/publicGameProviders.js",
    "sed -n '2728,2865p' /www/wwwroot/jowabuzz/frontend/src/index.css",
    "curl -s 'http://127.0.0.1:3001/api/site/providers?category=all&limit=30' | python3 -c \"import sys,json; d=json.load(sys.stdin); [print(x.get('code'), x.get('name'), x.get('logo','')[:60]) for x in d.get('data',[])[:20]]\"",
    "ls -la /www/wwwroot/jowabuzz/frontend/public/images/providers/ 2>/dev/null | head -25",
]

for i, cmd in enumerate(cmds, 1):
    print(f'======== {i} ========')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:8000])
    err = e.read().decode()
    if err.strip():
        print('ERR:', err[:300])
    print()

c.close()
