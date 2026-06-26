#!/usr/bin/env python3
"""Test hard delete user 49 and find FK blockers."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

USER_ID = 49

SQL = f"""
SET FOREIGN_KEY_CHECKS=0;
-- try with FK checks on first
SET FOREIGN_KEY_CHECKS=1;
START TRANSACTION;
DELETE FROM users WHERE id={USER_ID} AND role='user';
SELECT ROW_COUNT() AS deleted_rows;
ROLLBACK;

-- count child rows
SELECT 'user_wallets' AS tbl, COUNT(*) AS cnt FROM user_wallets WHERE user_id={USER_ID}
UNION ALL SELECT 'wallets', COUNT(*) FROM wallets WHERE user_id={USER_ID}
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions WHERE user_id={USER_ID}
UNION ALL SELECT 'bet_records', COUNT(*) FROM bet_records WHERE user_id={USER_ID}
UNION ALL SELECT 'affiliate_profiles', COUNT(*) FROM affiliate_profiles WHERE user_id={USER_ID}
UNION ALL SELECT 'user_otps', COUNT(*) FROM user_otps WHERE user_id={USER_ID}
UNION ALL SELECT 'game_sessions', COUNT(*) FROM game_sessions WHERE user_id={USER_ID}
UNION ALL SELECT 'deposit_requests', COUNT(*) FROM deposit_requests WHERE user_id={USER_ID}
UNION ALL SELECT 'withdraw_requests', COUNT(*) FROM withdraw_requests WHERE user_id={USER_ID};
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)

cmd = f"mysql -uroot -p656940d50e847e3f jowabuzz -e \"{SQL.replace(chr(10), ' ')}\" 2>&1"
stdin, stdout, stderr = c.exec_command(cmd, timeout=30)
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
c.close()
