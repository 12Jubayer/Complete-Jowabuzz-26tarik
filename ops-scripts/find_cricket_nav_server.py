"""Find mobile bottom nav Cricket button on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'Cricket\\|cricket\\|Lucky Sports\\|LUCKYSPORTS\\|lucky-sports' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' --include='*.tsx' 2>/dev/null | head -60",
    "grep -rn 'BottomNav\\|MobileNav\\|bottom-nav\\|bottomNav' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | head -40",
    "grep -rn 'sports' /www/wwwroot/jowabuzz/frontend/src/components --include='*.jsx' 2>/dev/null | head -40",
]

for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

c.close()
