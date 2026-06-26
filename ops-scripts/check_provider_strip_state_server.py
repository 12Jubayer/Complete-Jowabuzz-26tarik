"""Check current ProviderStrip state on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    'cat /www/wwwroot/jowabuzz/frontend/src/data/publicGameProviders.js',
    'head -80 /www/wwwroot/jowabuzz/frontend/src/components/ProviderStrip.jsx',
    'head -5 /www/wwwroot/jowabuzz/frontend/public/images/providers/default.svg',
    'ls -la /www/wwwroot/jowabuzz/frontend/public/images/providers/*.png | wc -l',
]

for cmd in cmds:
    print('===', cmd[:70], '===')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

c.close()
