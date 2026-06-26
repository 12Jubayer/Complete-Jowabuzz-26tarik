#!/usr/bin/env python3
import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -t -e \"SELECT id,name,phone,role,status FROM users WHERE phone='01900000000' OR name='jb'\" 2>/dev/null")
print(o.read().decode())
c.close()
