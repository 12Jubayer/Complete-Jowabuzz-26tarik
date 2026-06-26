"""Dig deeper into category default and URL persistence on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

files = [
    '/www/wwwroot/jowabuzz/frontend/src/components/GameCategoryNavigator.jsx',
    '/www/wwwroot/jowabuzz/frontend/src/components/CategoryScroller.jsx',
    '/www/wwwroot/jowabuzz/frontend/src/data/mobileCategories.js',
    '/www/wwwroot/jowabuzz/frontend/src/hooks/useMobileGameNavMode.js',
    '/www/wwwroot/jowabuzz/frontend/src/App.jsx',
]

for f in files:
    print('========', f.split('/')[-1], '========')
    _, o, _ = c.exec_command(f'cat "{f}"', timeout=30)
    print(o.read().decode('utf-8', 'replace')[:8000])
    print()

_, o, _ = c.exec_command(
    "grep -rn 'searchParams\\|useSearchParams\\|category=' /www/wwwroot/jowabuzz/frontend/src --include='*.jsx' --include='*.js' 2>/dev/null | head -30"
)
print('=== searchParams ===')
print(o.read().decode())

c.close()
