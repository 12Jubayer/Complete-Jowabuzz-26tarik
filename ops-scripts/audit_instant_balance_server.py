import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmds = [
    "grep -n 'syncWalletBalance\\|credit\\|approveDeposit\\|addBalance' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js | head -20",
    "grep -n 'syncWalletBalance\\|credit\\|approve' /www/wwwroot/jowabuzz/backend/services/winypayCallbackService.js | head -30",
    "grep -n 'syncWalletBalance\\|credit' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -25",
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT t.id, t.user_id, t.amount, t.status, t.created_at,
       w.order_id, w.status AS wp_status, w.processed_at AS wp_processed
FROM transactions t
LEFT JOIN winypay_payment_orders w ON w.transaction_id = t.id
WHERE t.type='deposit' AND t.created_at >= '2026-06-23 17:00:00'
ORDER BY t.id DESC LIMIT 12" """,
    """mysql -uroot -p656940d50e847e3f jowabuzz -e "
SELECT id, user_id, amount, status, created_at, updated_at
FROM transactions WHERE type='deposit' AND status='approved'
AND created_at >= '2026-06-23 17:00:00' ORDER BY id DESC LIMIT 8" """,
]
for cmd in cmds:
    _,o,_=c.exec_command(cmd, timeout=45)
    print('===', cmd[:55].replace('\n',' '))
    print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
