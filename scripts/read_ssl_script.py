import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command('cat /root/migration-ssl-setup.sh')
print(o.read().decode('utf-8', errors='replace'))
c.close()
