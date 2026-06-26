"""Verify admin still has all games, search hides marked ones."""
import paramiko
import json
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT COUNT(*) FROM games WHERE category='sports' AND is_active=1\""
)
print('DB active sports games:', o.read().decode().strip())

tests = [
    ('search_568', 'curl -s "http://127.0.0.1:3001/api/site/search?q=568win&limit=20"'),
    ('search_saba_sports', 'curl -s "http://127.0.0.1:3001/api/site/search?q=SABA%20Sports&limit=20"'),
    ('search_sbo_book', 'curl -s "http://127.0.0.1:3001/api/site/search?q=SBO%20Sportsbook&limit=20"'),
]

for name, cmd in tests:
    _, o, _ = c.exec_command(cmd)
    d = json.loads(o.read())
    games = [g.get('title') or g.get('name') for g in d.get('data', {}).get('games', [])]
    print(f'{name}:', games)

c.close()
