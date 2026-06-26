#!/usr/bin/env python3
"""Deploy WinyPay payment gateway integration to production."""
import re
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(__file__).resolve().parent.parent

FILES = [
    'backend/server.js',
    'backend/.env.example',
    'backend/controllers/userProfileController.js',
    'backend/controllers/userWithdrawOtpController.js',
    'backend/controllers/winypayController.js',
    'backend/routes/winypayRoutes.js',
    'backend/services/adminDepositService.js',
    'backend/services/adminWithdrawService.js',
    'backend/services/generalSettingsService.js',
    'backend/services/paymentGatewayConfig.js',
    'backend/services/paymentGatewayService.js',
    'backend/services/paymentWithdrawGatewayService.js',
    'backend/services/winypayCallbackService.js',
    'backend/services/winypayService.js',
    'backend/sql/winypay_payment_orders.sql',
    'backend/utils/winypayCallbackRawBody.js',
    'backend/scripts/test_winypay_integration.js',
    'backend/docs/WINYPAY_CURL_EXAMPLES.md',
    'frontend/src/pages/admin/AdminGeneralSettingPage.jsx',
    'frontend/src/pages/profile/ProfileDepositPage.jsx',
]

ENV_ADD_ONLY = {
    'WINYPAY_BASE_URL': 'https://bd.gopostman.com',
    'WINYPAY_MERCHANT_CODE': 'M10AAF98',
    'WINYPAY_CURRENCY': 'BDT',
    'WINYPAY_DEPOSIT_CALLBACK_URL': 'https://jowabuzz.com/api/payment/winypay/deposit-callback',
    'WINYPAY_WITHDRAW_CALLBACK_URL': 'https://jowabuzz.com/api/payment/winypay/withdraw-callback',
    'WINYPAY_JUMP_URL': 'https://jowabuzz.com/profile/deposit',
}


def ensure_remote_dir(sftp, remote_dir):
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


def upload_files(sftp):
    for rel in FILES:
        local = ROOT / rel
        if not local.exists():
            print('skip missing', rel)
            continue
        remote = f'{REMOTE}/{rel}'
        ensure_remote_dir(sftp, remote.rsplit('/', 1)[0])
        sftp.put(str(local), remote)
        print('uploaded', rel)


def patch_env_add_only(env_text: str) -> str:
    lines = env_text.splitlines()
    seen = set()
    out = []
    for line in lines:
        if not line.strip() or line.lstrip().startswith('#'):
            out.append(line)
            continue
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
        if not m:
            out.append(line)
            continue
        seen.add(m.group(1))
        out.append(line)
    for key, value in ENV_ADD_ONLY.items():
        if key not in seen:
            out.append(f'{key}={value}')
    return '\n'.join(out).rstrip() + '\n'


def run(client, cmd, timeout=300):
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


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = client.open_sftp()
    upload_files(sftp)

    env_path = f'{REMOTE}/backend/.env'
    with sftp.open(env_path, 'r') as f:
        env_text = f.read().decode('utf-8', errors='replace')
    patched = patch_env_add_only(env_text)
    if patched != env_text:
        with sftp.open(env_path, 'w') as f:
            f.write(patched)
        print('patched backend/.env (add-only; add WINYPAY_SECRET_KEY and WINYPAY_PAYOUT_KEY manually)')
    else:
        print('backend/.env keys already present')

    sftp.close()
    run(client, f'cd {REMOTE}/frontend && npm run build', timeout=600)
    run(client, 'pm2 restart jowabuzz --update-env')
    time.sleep(4)
    run(client, 'cd {}/backend && node scripts/test_winypay_integration.js'.format(REMOTE))
    code = run(client, 'curl -s http://127.0.0.1:3001/api/health')
    client.close()
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
