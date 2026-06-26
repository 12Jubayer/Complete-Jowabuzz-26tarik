"""Read HomePage provider/category state handling on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -n 'location.state\\|category\\|provider\\|onProviderSelect\\|LUCKYSPORTS' /www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx 2>/dev/null | head -60",
    "grep -n 'location.state\\|category\\|provider' /www/wwwroot/jowabuzz/frontend/src/components/GameCategoryNavigator.jsx 2>/dev/null | head -40",
    "grep -n 'location.state\\|category\\|provider' /www/wwwroot/jowabuzz/frontend/src/components/MobileMenuDrawer.jsx 2>/dev/null | head -40",
    "grep -rn 'state:.*category\\|state:.*provider\\|filterProvider' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' 2>/dev/null | head -30",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace')[:3000])
    print()

c.close()
