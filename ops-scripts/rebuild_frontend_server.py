import paramiko
import time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

print('Building frontend...')
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1', timeout=300)
# wait for build
time.sleep(45)
out = o.read().decode('utf-8', errors='replace')
err = e.read().decode('utf-8', errors='replace')
print(out[-3000:] if len(out) > 3000 else out)
if err:
    print('STDERR', err[-1500:])

_, o, _ = c.exec_command('test -f /www/wwwroot/jowabuzz/frontend/dist/index.html && echo INDEX_OK || echo INDEX_FAIL')
print(o.read().decode())

_, o, _ = c.exec_command('ls -la /www/wwwroot/jowabuzz/frontend/dist/ | head -20')
print(o.read().decode())

c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')

_, o, _ = c.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/")
time.sleep(3)
_, o2, _ = c.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/")
print('HTTP after restart:', o2.read().decode())
c.close()
