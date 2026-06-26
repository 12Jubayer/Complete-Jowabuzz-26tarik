#!/usr/bin/env python3
"""Deploy HMK integration + disable Oracle on production."""
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
    'backend/controllers/gameController.js',
    'backend/controllers/hmkController.js',
    'backend/routes/hmkRoutes.js',
    'backend/services/gamingProviderService.js',
    'backend/services/gamingGatewayService.js',
    'backend/services/hmkApiService.js',
    'backend/services/hmkCryptoService.js',
    'backend/utils/winypayCallbackRawBody.js',
    'backend/sql/hmk_game_transactions.sql',
    'backend/sql/hmk_provider_seed.sql',
    'backend/scripts/test_hmk_integration.js',
]

ENV_UPDATES = {
    'HMK_API_URL': 'https://767fafapi.live/api/v1',
    'HMK_CODE': 'HMK',
    'HMK_CURRENCY': 'USDT',
    'HMK_LANGUAGE': 'en',
    'HMK_CALLBACK_URL': 'https://jowabuzz.com/api/hmk/callback',
    'HMK_RETURN_URL': 'https://jowabuzz.com/game/return',
    'HMK_PRIMARY_PROVIDER': 'true',
    'ORACLE_ENABLED': 'false',
    'ORACLE_DISABLED': 'true',
}
# Set HMK_TOKEN, HMK_SECRET, HMK_USERNAME on server .env manually if not already present.


def patch_env(text):
    lines = text.splitlines()
    seen = {}
    out = []
    for line in lines:
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
        if m and m.group(1) in ENV_UPDATES:
            key = m.group(1)
            out.append(f'{key}={ENV_UPDATES[key]}')
            seen[key] = True
        else:
            out.append(line)
            if m:
                seen[m.group(1)] = True
    for key, val in ENV_UPDATES.items():
        if key not in seen:
            out.append(f'{key}={val}')
    return '\n'.join(out).rstrip() + '\n'


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = c.open_sftp()
    for rel in FILES:
        local = ROOT / rel
        if local.exists():
            sftp.put(str(local), f'{REMOTE}/{rel}')
            print('uploaded', rel)
    with sftp.open(f'{REMOTE}/backend/.env', 'r') as f:
        env = f.read().decode('utf-8', errors='replace')
    patched = patch_env(env)
    with sftp.open(f'{REMOTE}/backend/.env', 'w') as f:
        f.write(patched)
    print('patched backend/.env (HMK + Oracle disabled)')
    sftp.close()
    _, o, e = c.exec_command(f'cd {REMOTE}/backend && node scripts/test_hmk_integration.js', timeout=90)
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err.strip():
        print('stderr:', err)
    c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
    time.sleep(4)
    _, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/health && echo && curl -s http://127.0.0.1:3001/api/hmk/health', timeout=30)
    print(o.read().decode('utf-8', errors='replace'))
    c.close()
    print('DONE')


if __name__ == '__main__':
    main()
