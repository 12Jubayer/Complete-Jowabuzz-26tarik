import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

files = [
    '/www/wwwroot/jowabuzz/frontend/src/components/HeroSlider.jsx',
    '/www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx',
    '/www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js',
]

for f in files:
    print('===', f, '===')
    _, o, _ = c.exec_command(f"sed -n '1,120p' {f}", timeout=30)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

# count duplicate game start for user 38 around aviator time
_, o, _ = c.exec_command("pm2 logs jowabuzz --lines 300 --nostream 2>&1 | grep -A2 'userId: 38, gameId: 9663'", timeout=30)
print('user38 aviator logs:', o.read().decode('utf-8', 'replace'))

c.close()
