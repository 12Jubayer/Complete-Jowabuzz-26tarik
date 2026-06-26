import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("sed -n '49,95p' /www/wwwroot/jowabuzz/backend/controllers/gameController.js", timeout=20)
print('fetchGameAndProvider:\n', o.read().decode())
_, o, _ = c.exec_command("sed -n '540,620p' /www/wwwroot/jowabuzz/backend/controllers/gameController.js", timeout=20)
print('lookup:\n', o.read().decode())
_, o, _ = c.exec_command("sed -n '680,720p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=20)
print('searchAdminGames:\n', o.read().decode())
_, o, _ = c.exec_command("sed -n '508,545p' /www/wwwroot/jowabuzz/backend/services/gameCatalogService.js", timeout=20)
print('toggleProvider:\n', o.read().decode())
c.close()
