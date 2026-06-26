#!/usr/bin/env python3
"""Affiliate pending settlement only when commission >= 2000 BDT."""
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(__file__).resolve().parent.parent / 'JB-main(1)' / 'JB-main'
THRESHOLD = 2000

FILES = [
    'backend/services/affiliateSettlementPeriodService.js',
    'backend/controllers/adminAffiliateController.js',
]

CLEANUP = f"""
UPDATE affiliate_profiles ap
INNER JOIN affiliate_settlements s ON s.affiliate_id = ap.id
SET
  ap.pending_commission = GREATEST(ap.pending_commission - s.total_commission, 0),
  ap.available_balance = ap.available_balance + s.total_commission
WHERE s.status = 'pending'
  AND s.total_commission > 0
  AND s.total_commission < {THRESHOLD};

UPDATE affiliate_settlements
SET status = 'settled', approved_at = COALESCE(approved_at, NOW())
WHERE status = 'pending'
  AND total_commission > 0
  AND total_commission < {THRESHOLD};

UPDATE settlement_history
SET status = 'released'
WHERE status = 'pending'
  AND amount > 0
  AND amount < {THRESHOLD};
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = c.open_sftp()
    for rel in FILES:
        sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
        print('uploaded', rel)
    sftp.close()

    for cmd in [
        f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{CLEANUP.strip().replace(chr(10), " ")}"',
        f"""mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, affiliate_id, total_commission, status FROM affiliate_settlements WHERE status='pending' ORDER BY id" """,
        'pm2 restart jowabuzz --update-env',
        'sleep 2',
        'curl -s http://127.0.0.1:3001/api/health',
    ]:
        print('$', cmd[:70].replace('\n', ' '))
        _, o, _ = c.exec_command(cmd, timeout=60)
        print(o.read().decode('utf-8', errors='replace').rstrip())
    c.close()
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
