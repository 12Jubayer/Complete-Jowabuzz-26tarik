import paramiko
import time
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main')
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/hmkApiService.js',
    'backend/services/gameCatalogService.js',
    'backend/scripts/seed_9wicket_sports.js',
    'frontend/public/images/providers/9w.svg',
    'frontend/src/utils/providerLogo.js',
]

print('Deploying 9wicket fix...')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

for rel in FILES:
    local = ROOT / rel
    remote = f'{REMOTE}/{rel}'
    sftp.put(str(local), remote)
    print('uploaded', rel)

# upload frontend dist
dist = ROOT / 'frontend' / 'dist'
for item in dist.rglob('*'):
    if item.is_file():
        rel = item.relative_to(dist).as_posix()
        remote = f'{REMOTE}/frontend/dist/{rel}'
        try:
            sftp.stat(str(Path(remote).parent.as_posix().replace('\\', '/')))
        except FileNotFoundError:
            pass
        # ensure remote dir exists via ssh
        remote_dir = '/'.join(remote.split('/')[:-1])
        c.exec_command(f'mkdir -p {remote_dir}')
        sftp.put(str(item), remote)
print('uploaded frontend dist')

sftp.close()

_, o, e = c.exec_command(f'cd {REMOTE}/backend && node scripts/seed_9wicket_sports.js', timeout=60000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('SEED_ERR', err[:400])

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8', errors='replace')[:300])
time.sleep(2)

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=sports' | python3 -c \"import sys,json; d=json.load(sys.stdin); print([x for x in d.get('data',[]) if '9W' in str(x)])\"", timeout=30)
print('9W provider:', o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command(f'cd {REMOTE}/backend && node scripts/probe_9wicket_v2.js 2>&1 | tail -8', timeout=120000)
print('launch probe:', o.read().decode('utf-8', 'replace'))

c.close()
print('DONE')
