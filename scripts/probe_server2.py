import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'find / -maxdepth 4 -type d -name jowabuzz 2>/dev/null',
    'find / -maxdepth 4 -type d -name "JB-main*" 2>/dev/null',
    'ls -la /var/www/ 2>/dev/null',
    'ls -la /home/ 2>/dev/null',
    'ls -la /root/ 2>/dev/null | head -20',
    'nginx -t 2>&1; ls /etc/nginx/sites-enabled/ 2>/dev/null',
    'systemctl is-active nginx 2>/dev/null; systemctl is-active mysql 2>/dev/null; systemctl is-active mariadb 2>/dev/null',
    'which pm2; pm2 list',
    'ss -tlnp | grep -E ":80|:443|:3000|:5000|:8080"',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip(): print('ERR:', err[:500])
c.close()
