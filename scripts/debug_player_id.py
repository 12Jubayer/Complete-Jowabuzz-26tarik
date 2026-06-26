#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
CMD = """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "SELECT ap.id, ap.settlement_user_id, su.provider_username, su.name FROM affiliate_profiles ap LEFT JOIN users su ON su.id=ap.settlement_user_id WHERE ap.id=45;" """
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
chan = c.get_transport().open_session()
chan.settimeout(15)
chan.exec_command(CMD)
print(chan.recv(4096).decode())
c.close()
