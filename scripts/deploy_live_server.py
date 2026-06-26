#!/usr/bin/env python3
"""Deploy latest local Jowabuzz changes to production without touching secrets."""
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

BACKEND_FILES = [
    'backend/server.js',
    'backend/.env.example',
    'backend/controllers/adminDepositController.js',
    'backend/controllers/adminPlayerController.js',
    'backend/controllers/agentPlayerController.js',
    'backend/controllers/gameController.js',
    'backend/controllers/softapiController.js',
    'backend/controllers/userAgentWithdrawController.js',
    'backend/controllers/userProfileController.js',
    'backend/controllers/userWithdrawOtpController.js',
    'backend/routes/adminPlayerRoutes.js',
    'backend/routes/softapiRoutes.js',
    'backend/services/gamingProviderService.js',
    'backend/services/oracleGamingApiService.js',
    'backend/services/oracleGamesApiClient.js',
    'backend/services/oracleGamesV3ApiClient.js',
    'backend/services/softapiCryptoService.js',
    'backend/services/softapiService.js',
    'backend/services/withdrawChannelService.js',
    'backend/sql/softapi_game_transactions.sql',
    'backend/sql/softapi_provider_seed.sql',
    'backend/sql/withdraw_channel.sql',
    'backend/scripts/test_softapi_integration.js',
    'backend/scripts/test_withdraw_channel.js',
]

FRONTEND_FILES = [
    'frontend/src/components/BottomUserNav.jsx',
    'frontend/src/components/PlayerMobileNav.jsx',
    'frontend/src/components/profile/ProfilePageShell.jsx',
    'frontend/src/config/uiConfig.js',
    'frontend/src/index.css',
    'frontend/src/layouts/MobilePageLayout.jsx',
    'frontend/src/pages/HomePage.jsx',
    'frontend/src/pages/WithdrawPage.jsx',
    'frontend/src/pages/admin/AdminPlayersPage.jsx',
    'frontend/src/pages/profile/AccountPage.jsx',
    'frontend/src/pages/profile/ProfileDepositPage.jsx',
    'frontend/src/pages/profile/ProfileWithdrawPage.jsx',
    'frontend/src/services/adminPlayerService.js',
]

ENV_ADD_ONLY = {
    'SOFTAPI_BASE_URL': 'https://767fafapi.live/api/v1',
    'SOFTAPI_PROVIDER': 'SDR',
    'SOFTAPI_CURRENCY': 'BDT',
    'SOFTAPI_LANGUAGE': 'bn',
    'SOFTAPI_ENV': 'test',
    'SOFTAPI_RETURN_URL': 'https://jowabuzz.com/game/return',
    'SOFTAPI_CALLBACK_URL': 'https://jowabuzz.com/api/softapi/callback',
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


def upload_files(sftp, files):
    for rel in files:
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
        key = m.group(1)
        seen.add(key)
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

    upload_files(sftp, BACKEND_FILES + FRONTEND_FILES)

    env_path = f'{REMOTE}/backend/.env'
    with sftp.open(env_path, 'r') as f:
        env_text = f.read().decode('utf-8', errors='replace')
    patched = patch_env_add_only(env_text)
    if patched != env_text:
        with sftp.open(env_path, 'w') as f:
            f.write(patched)
        print('patched backend/.env (add-only, secrets untouched)')
    else:
        print('backend/.env unchanged')

    sftp.close()

    run(client, f'cd {REMOTE}/frontend && npm run build', timeout=600)
    run(client, 'pm2 restart jowabuzz --update-env')
    time.sleep(4)
    code = run(client, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health')
    print('health status:', code)
    client.close()
    return 0 if str(code).strip() == '200' else 1


if __name__ == '__main__':
    raise SystemExit(main())
