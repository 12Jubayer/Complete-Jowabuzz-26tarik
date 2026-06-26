import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
path = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'
with sftp.open(path, 'r') as f:
    text = f.read().decode('utf-8').replace('\r\n', '\n')

text = text.replace(', *hiddenProviders,', ', ...hiddenProviders,')
text = text.replace(', *hiddenProviders,', ', ...hiddenProviders,')

with sftp.open(path, 'w') as f:
    f.write(text.encode('utf-8'))
sftp.close()

_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node --check services/gameCatalogService.js', timeout=20)
print('check:', o.read().decode(), e.read().decode())
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode()[:200])
import time; time.sleep(3)
_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/search?q=aviator&limit=3'", timeout=30)
print(o.read().decode('utf-8', 'replace')[:900])
c.close()
