import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

path = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'
patch_py = r'''
path = "/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
text = open(path, encoding="utf-8").read()
old = "        normalizedCategory === 'slots' ? 'slot' : apiCategory,"
new = "        (normalizedCategory === 'slot' || normalizedCategory === 'slots') ? 'slot' : apiCategory,"
if old not in text:
    print("PATCH_SKIP")
else:
    open(path, "w", encoding="utf-8").write(text.replace(old, new, 1))
    print("PATCH_OK")
'''
_, o, e = c.exec_command(f'python3 -c {patch_py!r}', timeout=30000)
print(o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8','replace')[:150])

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=slot' | python3 -c \"import sys,json;d=json.load(sys.stdin);print('count',len(d.get('data',[])),'sample',[x['code'] for x in d.get('data',[])][:8])\"", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
