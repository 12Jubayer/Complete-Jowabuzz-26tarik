"""Read HomePage provider handling details."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command('sed -n "40,120p" /www/wwwroot/jowabuzz/frontend/src/pages/HomePage.jsx')
print(o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command(
    "grep -n 'selectedProvider\\|provider=' /www/wwwroot/jowabuzz/frontend/src/components/GameGrid.jsx 2>/dev/null | head -20"
)
print('GameGrid:', o.read().decode())

_, o, _ = c.exec_command(
    'curl -s "http://127.0.0.1:3001/api/site/providers?category=sports" | python3 -c "import sys,json; d=json.load(sys.stdin); print([(x.get(\'code\'),x.get(\'name\')) for x in d.get(\'data\',[]) if \'lucky\' in (x.get(\'name\') or \'\').lower()])"'
)
print('API sports lucky:', o.read().decode())

c.close()
