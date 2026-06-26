import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = '/www/wwwroot/jowabuzz/backend/services/gameCatalogService.js'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
with sftp.open(REMOTE, 'r') as f:
    text = f.read().decode('utf-8').replace('\r\n', '\n')

for needle in ['function buildSiteGameFilters', 'export async function listSiteProviders']:
    idx = text.find(needle)
    print('===', needle, '===')
    print(text[idx:idx+1800])
    print()

c.close()
