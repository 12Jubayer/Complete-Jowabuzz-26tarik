import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
print('Running SSL setup...')
chan = c.get_transport().open_session()
chan.settimeout(600)
chan.exec_command('bash /root/migration-ssl-setup.sh admin@jowabuzz.com 2>&1')
while True:
    if chan.recv_ready():
        print(chan.recv(8192).decode('utf-8', errors='replace'), end='', flush=True)
    if chan.recv_stderr_ready():
        print(chan.recv_stderr(8192).decode('utf-8', errors='replace'), end='', flush=True)
    if chan.exit_status_ready():
        while chan.recv_ready():
            print(chan.recv(8192).decode('utf-8', errors='replace'), end='', flush=True)
        break
    time.sleep(0.3)
code = chan.recv_exit_status()
print(f'\nExit: {code}')

# verify HTTPS
for url in ['https://jowabuzz.com/', 'https://jowabuzz.shop/agent', 'https://jowabuzzaffiliate.com/']:
    _, o, _ = c.exec_command(f'curl -sk -o /dev/null -w "%{{http_code}}" {url}')
    status = o.read().decode().strip()
    print(f'{url} -> HTTP {status}')

c.close()
sys.exit(code)
