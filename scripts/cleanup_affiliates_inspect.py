#!/usr/bin/env python3
import sys, paramiko
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60)
cmd = """
mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT COUNT(*) AS registered_affiliates FROM affiliate_profiles WHERE registered_as_affiliate=1;
SELECT COUNT(*) AS player_referral_profiles FROM affiliate_profiles WHERE registered_as_affiliate=0;
SELECT id,name,phone FROM users WHERE id IN (18,34,39,42,43);
SELECT COUNT(*) AS total_players FROM users WHERE role='user';
SELECT id,name FROM affiliate_profiles ap JOIN users u ON u.id=ap.user_id WHERE registered_as_affiliate=1;
"
"""
_, o, _ = c.exec_command(cmd, timeout=30)
print(o.read().decode())
c.close()
