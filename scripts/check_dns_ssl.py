import paramiko, sys, socket
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

domains = ['jowabuzz.com', 'www.jowabuzz.com', 'jowabuzz.shop', 'www.jowabuzz.shop', 
           'jowabuzzaffiliate.com', 'www.jowabuzzaffiliate.com']
target = '103.165.10.242'

print('=== DNS Check ===')
for d in domains:
    try:
        ip = socket.gethostbyname(d)
        ok = 'OK' if ip == target else f'WRONG ({ip})'
        print(f'{d:30} -> {ip}  {ok}')
    except Exception as e:
        print(f'{d:30} -> FAIL: {e}')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    'ls -la /etc/letsencrypt/live/ 2>/dev/null',
    'which certbot; certbot --version 2>/dev/null',
    'test -f /root/migration-ssl-setup.sh && echo SSL_SCRIPT_OK',
    'curl -s -o /dev/null -w "http jowabuzz.com: %{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/',
    'pm2 list | grep jowabuzz',
]
for cmd in cmds:
    print(f'\n=== {cmd} ===')
    _, o, e = c.exec_command(cmd)
    print((o.read() + e.read()).decode('utf-8', errors='replace'))
c.close()
