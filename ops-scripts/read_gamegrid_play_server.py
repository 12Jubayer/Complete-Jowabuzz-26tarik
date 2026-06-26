"""Read GameGrid handlePlay and HomePage BottomUserNav usage."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "sed -n '1,95p' /www/wwwroot/jowabuzz/frontend/src/components/GameGrid.jsx",
    "sed -n '165,195p' /www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx",
    "grep -rn 'showToast' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' 2>/dev/null | head -15",
    "head -30 /www/wwwroot/jowabuzz/frontend/src/utils/toast.js 2>/dev/null || head -30 /www/wwwroot/jowabuzz/frontend/src/context/ToastContext.jsx 2>/dev/null",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, _ = c.exec_command(cmd, timeout=30)
    print(o.read().decode('utf-8', 'replace')[:4000])
    print()

c.close()
