"""Check MobilePageLayout and deploy cricket -> Lucky Sports fix."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
FILE = f'{ROOT}/frontend/src/components/BottomUserNav.jsx'

OLD = """    if (item.id === 'cricket') {
      navigate('/', { state: { category: 'sports' } });
      return;
    }"""

NEW = """    if (item.id === 'cricket') {
      navigate('/', { state: { category: 'sports', provider: 'LUCKYSPORTS' } });
      return;
    }"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(FILE, 'r') as f:
    content = f.read().decode('utf-8').replace('\r\n', '\n')

if OLD not in content:
    if NEW.split('\n')[1].strip() in content:
        print('ALREADY_PATCHED')
    else:
        print('PATTERN_NOT_FOUND')
        print(content[content.find("item.id === 'cricket'") - 20:content.find("item.id === 'cricket'") + 200])
        sftp.close()
        c.close()
        sys.exit(1)
else:
    content = content.replace(OLD, NEW, 1)
    with sftp.open(FILE, 'w') as f:
        f.write(content.encode('utf-8'))
    print('PATCHED BottomUserNav.jsx')

sftp.close()

print('Building frontend...')
_, o, e = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1', timeout=300000)
out = o.read().decode('utf-8', 'replace')
err = e.read().decode('utf-8', 'replace')
combined = (out + err)
if 'built in' in combined.lower() or '✓' in combined:
    print('BUILD_OK')
else:
    print(combined[-3000:])

_, o, _ = c.exec_command(f"grep -n \"provider: 'LUCKYSPORTS'\" {FILE}")
print('verify:', o.read().decode().strip())

c.close()
print('DONE')
