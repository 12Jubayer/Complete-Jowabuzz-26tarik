import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmd = r"""sed -i "s/normalizedCategory === 'slots' ? 'slot' : apiCategory/(normalizedCategory === 'slot' || normalizedCategory === 'slots') ? 'slot' : apiCategory/" /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"""
_, o, e = c.exec_command(cmd, timeout=30000)
print('sed', o.read().decode(), e.read().decode())

_, o, _ = c.exec_command("grep -n \"normalizedCategory === 'slot'\" /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -2", timeout=30)
print(o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8','replace')[:120])

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=slot' | python3 -c \"import sys,json;d=json.load(sys.stdin);print('count',len(d.get('data',[])))\"", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
