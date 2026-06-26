import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command('mysql -uroot -p656940d50e847e3f -e "SHOW DATABASES;"')
print(o.read().decode())
print(e.read().decode())
c.close()
