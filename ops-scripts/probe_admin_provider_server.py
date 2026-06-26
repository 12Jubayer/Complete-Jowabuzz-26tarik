import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "sed -n '1,120p' /www/wwwroot/jowabuzz/backend/controllers/adminProviderController.js",
    "grep -n 'toggleProvider\\|updateProvider\\|provider_logo\\|patchAdmin' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js | head -30",
    "grep -n 'Provider Setting\\|providerNameDraft\\|toggleAdminProvider\\|updateProvider' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx | head -40",
    "sed -n '400,650p' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:6000])
    print()

c.close()
