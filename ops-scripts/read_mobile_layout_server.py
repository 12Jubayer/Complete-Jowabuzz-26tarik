"""Read MobilePageLayout and AuthToast."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command('cat /www/wwwroot/jowabuzz/frontend/src/layouts/MobilePageLayout.jsx')
print(o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command('cat /www/wwwroot/jowabuzz/frontend/src/components/AuthToast.jsx')
print('--- AuthToast ---')
print(o.read().decode('utf-8', 'replace')[:1500])

c.close()
