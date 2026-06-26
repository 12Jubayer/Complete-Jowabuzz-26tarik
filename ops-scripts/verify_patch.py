import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command("grep -n 'succeedLaunch\\|earlyGuardKey\\|cache hit' /www/wwwroot/jowabuzz/backend/controllers/gameController.js | head -20", timeout=20)
print(o.read().decode('utf-8', 'replace'))
_, o, _ = c.exec_command("pm2 status jowabuzz 2>&1 | head -8", timeout=20)
print(o.read().decode('utf-8', 'replace'))
c.close()
