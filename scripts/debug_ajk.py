#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
queries = [
    "SELECT id,name,phone,status FROM users WHERE name LIKE '%ajk%';",
    "SELECT id,name,phone,status FROM users WHERE status='deleted' AND role='user';",
    "SELECT id,name,phone,status FROM users WHERE phone LIKE '%555555%';",
]
for q in queries:
    CMD = f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{q}" 2>&1'
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
    chan = c.get_transport().open_session()
    chan.settimeout(20)
    chan.exec_command(CMD)
    out = b''
    while True:
        if chan.recv_ready():
            out += chan.recv(8192)
        if chan.exit_status_ready():
            while chan.recv_ready():
                out += chan.recv(8192)
            break
    print('QUERY:', q)
    print(out.decode())
    c.close()
