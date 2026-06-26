import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

files = [
    '/www/wwwroot/jowabuzz/backend/services/hmkApiService.js',
    '/www/wwwroot/jowabuzz/backend/controllers/gameController.js',
]

for f in files:
    _, o, _ = c.exec_command(f"wc -l {f}", timeout=20)
    lines = int(o.read().decode().split()[0])
    _, o, _ = c.exec_command(f"sed -n '450,620p' {f}" if 'hmk' in f else f"sed -n '70,280p' {f}", timeout=30)
    print('===', f, '===')
    print(o.read().decode('utf-8', 'replace'))

c.close()
