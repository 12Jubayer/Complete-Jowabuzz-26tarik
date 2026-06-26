import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    'mysql -uroot -p656940d50e847e3f jowabuzz -e "SHOW COLUMNS FROM affiliate_profiles LIKE \'available_balance\'; SHOW COLUMNS FROM affiliate_settlements LIKE \'settlement_source\'; SHOW TABLES LIKE \'affiliate_pending_bets\';"',
    'pm2 logs jowabuzz --lines 15 --nostream 2>/dev/null | tail -15',
    'curl -s http://127.0.0.1:3001/api/health',
]
for cmd in cmds:
    print('===', cmd[:80], '===')
    _, o, e = c.exec_command(cmd)
    print((o.read()+e.read()).decode('utf-8', errors='replace'))
c.close()
