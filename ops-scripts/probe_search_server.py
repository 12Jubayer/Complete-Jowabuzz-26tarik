import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'Search Games\\|search' /www/wwwroot/jowabuzz/frontend/src/components/MobileMenuDrawer.jsx | head -30",
    "grep -rn 'search' /www/wwwroot/jowabuzz/backend/routes/*.js /www/wwwroot/jowabuzz/backend/controllers/*.js 2>/dev/null | head -40",
    "grep -rn 'searchGames\\|site/search\\|/api/site' /www/wwwroot/jowabuzz/frontend/src --include='*.js' --include='*.jsx' | head -30",
    "wc -l /www/wwwroot/jowabuzz/frontend/src/components/MobileMenuDrawer.jsx",
]

for cmd in cmds:
    print('===', cmd[:95], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000] or '(empty)')
    print()

c.close()
