#!/usr/bin/env python3
"""Stop zero-amount affiliate settlements appearing in admin pending list."""
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(__file__).resolve().parent.parent / 'JB-main(1)' / 'JB-main'

FILES = [
    'backend/services/affiliateSettlementPeriodService.js',
    'backend/controllers/adminAffiliateController.js',
]

CLEANUP_SQL = """
UPDATE affiliate_settlements
SET status = 'settled', approved_at = COALESCE(approved_at, NOW())
WHERE status = 'pending' AND total_commission <= 0;

UPDATE settlement_history
SET status = 'released'
WHERE status = 'pending' AND amount <= 0;
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = c.open_sftp()
    for rel in FILES:
        local = ROOT / rel
        remote = f'{REMOTE}/{rel}'
        sftp.put(str(local), remote)
        print('uploaded', rel)
    sftp.close()

    cmds = [
        f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{CLEANUP_SQL.strip().replace(chr(10), " ")}"',
        """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT status, COUNT(*) cnt, SUM(total_commission) total
FROM affiliate_settlements GROUP BY status" """,
        """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT COUNT(*) AS zero_pending
FROM affiliate_settlements WHERE status='pending' AND total_commission<=0" """,
        'pm2 restart jowabuzz --update-env',
        'sleep 2',
        'curl -s http://127.0.0.1:3001/api/health',
    ]
    for cmd in cmds:
        print('$', cmd[:75].replace('\n', ' '))
        _, o, e = c.exec_command(cmd, timeout=60)
        out = o.read().decode('utf-8', errors='replace')
        err = e.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out.rstrip())
        if err.strip():
            print(err.rstrip())
    c.close()
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
