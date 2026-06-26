#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
cmd = (
    'mysql jowabuzz -e '
    '"SELECT id,user_id,bet_amount,win_amount,balance_before,balance_after,status,created_at '
    'FROM hmk_game_transactions ORDER BY id DESC LIMIT 12;" 2>&1'
)
_, o, _ = c.exec_command(cmd, timeout=30)
print(o.read().decode('utf-8', 'replace'))
c.close()
