"""Find ProviderStrip and provider components on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'ProviderStrip\\|Game Providers\\|game-provider' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.css' 2>/dev/null | head -40",
    "cat /www/wwwroot/jowabuzz/frontend/src/components/ProviderStrip.jsx 2>/dev/null",
    "grep -rn 'provider-strip\\|jb-provider' /www/wwwroot/jowabuzz/frontend/src --include='*.css' 2>/dev/null | head -30",
    "cat /www/wwwroot/jowabuzz/frontend/src/services/providerService.js 2>/dev/null | head -80",
]

for i, cmd in enumerate(cmds, 1):
    print(f'======== {i} ========')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:10000])
    print()

c.close()
