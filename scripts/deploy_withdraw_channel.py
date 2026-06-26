#!/usr/bin/env python3
"""Deploy withdraw channel lock feature to production."""
import sys
import time
import paramiko
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HOST, USER, PASSWORD = '103.168.173.101', 'root', 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
root = Path(__file__).resolve().parent.parent

FILES = [
    'backend/services/withdrawChannelService.js',
    'backend/sql/withdraw_channel.sql',
    'backend/controllers/agentPlayerController.js',
    'backend/controllers/adminDepositController.js',
    'backend/controllers/userAgentWithdrawController.js',
    'backend/controllers/userWithdrawOtpController.js',
    'backend/controllers/userProfileController.js',
    'backend/controllers/adminPlayerController.js',
    'backend/routes/adminPlayerRoutes.js',
    'backend/server.js',
    'backend/scripts/test_withdraw_channel.js',
    'frontend/src/pages/WithdrawPage.jsx',
    'frontend/src/pages/profile/ProfileWithdrawPage.jsx',
    'frontend/src/pages/admin/AdminPlayersPage.jsx',
    'frontend/src/services/adminPlayerService.js',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = client.open_sftp()

for rel in FILES:
    local = root / rel
    remote = f'{REMOTE}/{rel}'
    remote_dir = remote.rsplit('/', 1)[0]
    try:
        sftp.stat(remote_dir)
    except OSError:
        parts = remote_dir.replace(REMOTE + '/', '').split('/')
        cur = REMOTE
        for part in parts:
            cur = f'{cur}/{part}'
            try:
                sftp.stat(cur)
            except OSError:
                sftp.mkdir(cur)
    sftp.put(str(local), remote)
    print('uploaded', rel)

sftp.close()


def run(cmd, timeout=300):
    print('\n$ ' + cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    return code


run(f'cd {REMOTE}/frontend && npm install && npm run build', timeout=600)
run('pm2 restart jowabuzz --update-env')
time.sleep(4)
code = run(f'cd {REMOTE}/backend && node scripts/test_withdraw_channel.js')
client.close()
raise SystemExit(code)
