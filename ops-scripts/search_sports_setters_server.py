"""Search all sports category setters on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn \"'sports'\\|\\\"sports\\\"\" /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | grep -v 'sportsbook\\|cricket\\|Sportsbook\\|label\\|category:' | head -50",
    "cat /www/wwwroot/jowabuzz/frontend/src/components/HomeRouteEntry.jsx 2>/dev/null || cat /www/wwwroot/jowabuzz/frontend/src/components/HomeRouteEntry.js 2>/dev/null",
    "grep -rn 'setSelectedCategory\\|setActiveNavCategory\\|location.state' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' 2>/dev/null",
    "cat /www/wwwroot/jowabuzz/frontend/src/utils/categoryNavigation.js",
]

for cmd in cmds:
    print('===', cmd[:85], '===')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace')[:6000])
    print()

c.close()
