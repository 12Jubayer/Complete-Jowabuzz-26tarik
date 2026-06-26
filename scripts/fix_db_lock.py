import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    'mysql -uroot -p656940d50e847e3f -e "SHOW PROCESSLIST;"',
    'mysql -uroot -p656940d50e847e3f -e "SELECT id, user, command, time, state, LEFT(info,80) FROM information_schema.processlist WHERE db=\'jowabuzz\' OR command!=\'Sleep\';"',
]
for cmd in cmds:
    print('===', cmd, '===')
    _, o, e = c.exec_command(cmd)
    print(o.read().decode())
    print(e.read().decode())
c.close()
