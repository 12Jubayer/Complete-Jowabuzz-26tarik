"""Read BottomUserNav and sports provider routing on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

files = [
    '/www/wwwroot/jowabuzz/frontend/src/components/BottomUserNav.jsx',
    '/www/wwwroot/jowabuzz/frontend/src/components/PlayerMobileNav.jsx',
]

for f in files:
    print('========', f, '========')
    _, o, _ = c.exec_command(f'cat "{f}"', timeout=30)
    print(o.read().decode('utf-8', 'replace')[:8000])
    print()

_, o, _ = c.exec_command(
    "grep -rn 'LUCKYSPORTS\\|Lucky Sports\\|provider.*sports\\|category.*sports' "
    "/www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | head -50"
)
print('=== sports provider refs ===')
print(o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT id, code, name, enabled FROM providers WHERE name LIKE '%Lucky%' OR code LIKE '%LUCKY%'\""
)
print('=== DB lucky providers ===')
print(o.read().decode())

c.close()
