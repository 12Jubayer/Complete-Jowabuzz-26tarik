#!/usr/bin/env python3
import paramiko

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'
SQL = """
SELECT COUNT(*) AS all_profiles FROM affiliate_profiles;
SELECT COUNT(*) AS registered_approved
FROM affiliate_profiles ap
INNER JOIN users u ON u.id = ap.user_id
WHERE ap.registered_as_affiliate = 1 AND ap.status = 'approved';
SELECT ap.id, u.name, ap.referral_code, ap.total_referrals
FROM affiliate_profiles ap
INNER JOIN users u ON u.id = ap.user_id
WHERE ap.registered_as_affiliate = 1 AND ap.status = 'approved';
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
_, stdout, stderr = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT COUNT(*) FROM affiliate_profiles; "
    "SELECT COUNT(*) FROM affiliate_profiles ap INNER JOIN users u ON u.id=ap.user_id "
    "WHERE ap.registered_as_affiliate=1 AND ap.status='approved'; "
    "SELECT ap.id, u.name, ap.referral_code FROM affiliate_profiles ap "
    "INNER JOIN users u ON u.id=ap.user_id WHERE ap.registered_as_affiliate=1 AND ap.status='approved';\""
)
print(stdout.read().decode())
err = stderr.read().decode()
if err.strip():
    print(err)
c.close()
