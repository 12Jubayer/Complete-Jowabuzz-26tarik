import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT p.id,p.code,p.name,p.enabled,p.status,p.provider_logo FROM providers p WHERE p.status='active' AND (p.name LIKE '%sport%' OR p.name LIKE '%lucky%' OR p.name LIKE '%LUCKY%' OR p.code IN ('LUCKYSPORTS','LS','9W','SABA','SBO','WS','TBC')) ORDER BY p.name;\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT p.code,p.name,COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.category='sports' AND g.is_active=1 GROUP BY p.id,p.code,p.name ORDER BY p.name;\"",
    "curl -s 'http://127.0.0.1:3001/api/site/providers?category=sports' | python3 -c \"import sys,json;d=json.load(sys.stdin);print('count',len(d.get('data',[])));[print(x.get('code'),x.get('name')) for x in d.get('data',[])]\"",
    "grep -rn 'admin.*provider\\|Provider' /www/wwwroot/jowabuzz/backend/routes/admin*.js 2>/dev/null | head -25",
    "grep -rn 'provider' /www/wwwroot/jowabuzz/frontend/src/pages/admin --include='*.jsx' 2>/dev/null | head -20",
]

for cmd in cmds:
    print('===', cmd[:100], '===')
    _, o, e = c.exec_command(cmd, timeout=90)
    out = o.read().decode('utf-8', 'replace')
    err = e.read().decode('utf-8', 'replace')
    print(out[:5000] if out else '(empty)')
    if err and 'Warning' not in err:
        print('ERR', err[:500])
    print()

c.close()
