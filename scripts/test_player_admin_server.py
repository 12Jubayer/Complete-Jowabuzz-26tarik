#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
CMD = "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/health && echo && mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SHOW COLUMNS FROM users LIKE 'withdraw_blocked';\""
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
chan = c.get_transport().open_session()
chan.settimeout(20)
chan.exec_command(CMD)
out = b''
while True:
    if chan.recv_ready():
        out += chan.recv(4096)
    if chan.exit_status_ready():
        while chan.recv_ready():
            out += chan.recv(4096)
        break
print(out.decode())
c.close()
