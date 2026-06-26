"""Patch remaining provider enabled loopholes on server."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CAT = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')

count = cat.count('AND (p.enabled = 1 OR p.enabled IS NULL)')
cat = cat.replace(
    'AND (p.enabled = 1 OR p.enabled IS NULL)',
    'AND p.enabled = 1',
)
print(f'replaced {count} occurrences')

with sftp.open(CAT, 'w') as f:
    f.write(cat.encode('utf-8'))

sftp.close()

_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node --check services/gameCatalogService.js')
print('syntax:', e.read().decode()[:200] or 'ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env')
print(o.read().decode('utf-8', 'replace')[:150])
time.sleep(2)

_, o, _ = c.exec_command(
    "grep -n 'enabled IS NULL' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js"
)
print('remaining:', o.read().decode().strip())
c.close()
