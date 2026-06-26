import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -n \"normalizedCategory === 'slots'\" /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=30)
print(o.read().decode('utf-8','replace'))
_, o, _ = c.exec_command("sed -n '918,932p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
