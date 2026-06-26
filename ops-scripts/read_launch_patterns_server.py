"""Read game launch patterns and BottomUserNav usage on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'BottomUserNav\\|launchOracleGame' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' 2>/dev/null",
    "sed -n '300,360p' /www/wwwroot/jowabuzz/frontend/src/components/MobileMenuDrawer.jsx",
    "sed -n '100,200p' /www/wwwroot/jowabuzz/frontend/src/components/GameGrid.jsx",
    "tail -n +120 /www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js | head -80",
    "cat /www/wwwroot/jowabuzz/frontend/src/components/BottomUserNav.jsx",
]

for i, cmd in enumerate(cmds):
    print(f'--- block {i+1} ---')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace')[:6000])
    print()

c.close()
