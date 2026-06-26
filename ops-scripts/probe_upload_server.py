import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -rn 'multer\\|upload\\|formidable' /www/wwwroot/jowabuzz/backend --include='*.js' | head -40",
    "grep -rn 'upload' /www/wwwroot/jowabuzz/backend/routes/admin*.js | head -25",
    "grep -rn 'upload\\|providerLogo' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx | head -20",
    "ls -la /www/wwwroot/jowabuzz/frontend/public/images/providers/ 2>/dev/null | head -15",
    "ls -la /www/wwwroot/jowabuzz/backend/uploads/ 2>/dev/null | head -10",
]

for cmd in cmds:
    print('===', cmd[:95], '===')
    _, o, _ = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:3500] or '(empty)')
    print()

c.close()
