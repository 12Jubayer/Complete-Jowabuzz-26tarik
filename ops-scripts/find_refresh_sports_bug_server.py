"""Find why mobile refresh goes to sports category on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'sessionStorage\\|localStorage\\|location.state\\|selectedCategory\\|activeNavCategory\\|sports' /www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx 2>/dev/null",
    "grep -rn 'sessionStorage\\|localStorage' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | grep -i 'categor\\|provider\\|sport\\|nav' | head -40",
    "cat /www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx",
    "grep -rn 'LUCKYSPORTS\\|category.*sports\\|sports.*provider' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | head -30",
    "cat /www/wwwroot/jowabuzz/frontend/src/components/BottomUserNav.jsx | head -150",
]

for i, cmd in enumerate(cmds, 1):
    print(f'======== {i} ========')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:12000])
    print()

c.close()
