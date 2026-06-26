"""Find sports providers and hidden provider mechanism on server."""
import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e "
    "\"SELECT g.id, g.code, g.name, p.code AS provider_code, p.name AS provider_name "
    "FROM games g JOIN providers p ON p.id=g.provider_id "
    "WHERE g.category='sports' AND g.is_active=1 ORDER BY g.name\"",
    "grep -rn 'HIDDEN_SITE\\|hiddenProviders\\|hidden.*provider' /www/wwwroot/jowabuzz --include='*.js' --include='*.jsx' 2>/dev/null | head -40",
    "curl -s 'http://127.0.0.1:3001/api/site/games?category=sports&limit=50'",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace')[:8000])
    err = e.read().decode('utf-8', 'replace')
    if err.strip():
        print('ERR:', err[:500])
    print()

c.close()
