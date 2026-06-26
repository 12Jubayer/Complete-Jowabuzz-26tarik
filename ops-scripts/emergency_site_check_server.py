import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "pm2 list",
    "pm2 logs jowabuzz --lines 30 --nostream 2>&1 | tail -35",
    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/",
    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/site-config/deposit-withdraw-rules",
    "ls -la /www/wwwroot/jowabuzz/frontend/dist/ 2>&1 | head -15",
    "test -f /www/wwwroot/jowabuzz/frontend/dist/index.html && echo INDEX_OK || echo INDEX_MISSING",
    "grep -r 'root\\|try_files\\|jowabuzz' /www/server/panel/vhost/nginx/jowabuzz.com.conf 2>/dev/null | head -20",
    "curl -sI https://jowabuzz.com/ 2>&1 | head -15",
    "curl -s https://jowabuzz.com/ 2>&1 | head -5",
]
for cmd in cmds:
    print('===', cmd[:70])
    _,o,e=c.exec_command(cmd)
    out=o.read().decode('utf-8', errors='replace')
    err=e.read().decode('utf-8', errors='replace')
    print(out.encode('ascii', errors='replace').decode()[:1500])
    if err.strip(): print('ERR', err[:300])
c.close()
