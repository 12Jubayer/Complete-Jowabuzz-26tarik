import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("grep -n 'handleProviderNameSave\\|updateAdminProvider\\|providerName' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=30)
print(o.read().decode())
_, o, _ = c.exec_command("grep -rn 'updateAdminProvider\\|patchAdminProvider\\|provider' /www/wwwroot/jowabuzz/frontend/src/services/adminGameService.js", timeout=30)
print('---service---')
print(o.read().decode())
_, o, _ = c.exec_command("grep -n 'formatProviderDisplayName' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=20)
_, o2, _ = c.exec_command("sed -n '990,1020p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=20)
print('---format---')
print(o2.read().decode())
c.close()
