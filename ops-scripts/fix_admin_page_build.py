import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | rg -n "error|ERROR|AdminGamesPage" | head -20', timeout=120000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace'))
_, o, _ = c.exec_command("grep -n 'useMemo\\|handleProviderNameSave\\|handleProviderDetailsSave\\|filteredAdminProviders' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=20)
print(o.read().decode())
_, o, _ = c.exec_command("sed -n '1,5p' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=20)
print('imports:', o.read().decode())
_, o, _ = c.exec_command("sed -n '400,560p' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=20)
print(o.read().decode())
c.close()
