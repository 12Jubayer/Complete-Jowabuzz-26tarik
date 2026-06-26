import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
path = '/www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx'
with sftp.open(path, 'r') as f:
    page = f.read().decode('utf-8').replace('\r\n', '\n')

old = '''              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">'''

new = '''              </table>
            </div>
          </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">'''

if old in page:
    page = page.replace(old, new, 1)
    with sftp.open(path, 'w') as f:
        f.write(page.encode('utf-8'))
    print('FIXED missing closing div')
else:
    print('pattern not found')

sftp.close()

sql = """
mysql -uroot -p656940d50e847e3f jowabuzz -e "
UPDATE providers p JOIN games g ON g.provider_id=p.id AND g.is_active=1
SET p.provider_logo = COALESCE(g.custom_image_url, g.image_url)
WHERE p.code IN ('LUCKYSPORTS','WS','BTI','CMD','DP','BETBY','TBC','WYNSOSPORTS')
AND (p.provider_logo IS NULL OR p.provider_logo='')
AND COALESCE(g.custom_image_url,g.image_url) IS NOT NULL AND COALESCE(g.custom_image_url,g.image_url)!='';
"
"""
_, o, _ = c.exec_command(sql, timeout=30)
print(o.read().decode())

_, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -6', timeout=300000)
print(o.read().decode('utf-8', 'replace'))
c.close()
