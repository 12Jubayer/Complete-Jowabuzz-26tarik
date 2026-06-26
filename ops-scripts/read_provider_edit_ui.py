import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("sed -n '470,520p' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=20)
print(o.read().decode())
c.close()
