import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
for cmd in [
    "test -f /www/wwwroot/jowabuzz/frontend/dist/index.html && wc -c /www/wwwroot/jowabuzz/frontend/dist/index.html || echo FAIL",
    "ls /www/wwwroot/jowabuzz/frontend/dist/assets/*.js 2>/dev/null | wc -l",
    "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/",
    "curl -s -o /dev/null -w '%{http_code}' https://jowabuzz.com/",
]:
    _,o,_=c.exec_command(cmd)
    print(cmd, '->', o.read().decode().strip())
c.close()
