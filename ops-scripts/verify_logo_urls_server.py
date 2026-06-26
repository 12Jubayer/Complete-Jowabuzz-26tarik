import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
for logo in ['jdb.png', 'spribe.png', 'yesbingo.png', 'fastspin.png']:
    _, o, _ = c.exec_command(f'curl -s -o /dev/null -w "%{{http_code}} %{{size_download}}" http://127.0.0.1:3001/images/providers/{logo}')
    print(logo, o.read().decode().strip())
c.close()
