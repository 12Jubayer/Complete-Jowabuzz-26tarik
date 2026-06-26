#!/usr/bin/env python3
"""Deploy SoftAPI SDR integration and run integration tests on production server."""
import json
import re
import sys
import textwrap

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/softapiCryptoService.js',
    'backend/services/softapiService.js',
    'backend/controllers/softapiController.js',
    'backend/routes/softapiRoutes.js',
    'backend/services/gamingProviderService.js',
    'backend/controllers/gameController.js',
    'backend/server.js',
    'backend/sql/softapi_game_transactions.sql',
    'backend/sql/softapi_provider_seed.sql',
    'backend/scripts/test_softapi_integration.js',
    'backend/.env.example',
]

ENV_PATCH = {
    'SOFTAPI_BASE_URL': 'https://767fafapi.live/api/v1',
    'SOFTAPI_PROVIDER': 'SDR',
    'SOFTAPI_TOKEN': '785103d6bb36532dad159078d6b1f16f',
    'SOFTAPI_SECRET': '8245907d5882a746927243835ffb35c6',
    'SOFTAPI_CURRENCY': 'BDT',
    'SOFTAPI_LANGUAGE': 'bn',
    'SOFTAPI_ENV': 'test',
    'SOFTAPI_RETURN_URL': 'https://jowabuzz.com/game/return',
    'SOFTAPI_CALLBACK_URL': 'https://jowabuzz.com/api/softapi/callback',
}


def apply_patch(text: str) -> str:
    lines = text.splitlines()
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
        if key in ENV_PATCH:
            out.append(f'{key}={ENV_PATCH[key]}')
            seen.add(key)
        else:
            out.append(line)
    for key, value in ENV_PATCH.items():
        if key not in seen:
            out.append(f'{key}={value}')
    return '\n'.join(out).rstrip() + '\n'


def run(client, cmd, timeout=180):
    print('\n$ ' + cmd)
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip())
    return code, out, err


def main():
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = client.open_sftp()

    for rel in FILES:
        local = root / rel
        if not local.exists():
            print('missing local file:', rel)
            continue
        remote_path = f'{REMOTE}/{rel}'
        remote_dir = remote_path.rsplit('/', 1)[0]
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
        sftp.put(str(local), remote_path)
        print('uploaded', rel)

    env_path = f'{REMOTE}/backend/.env'
    with sftp.open(env_path, 'r') as f:
        env_text = f.read().decode('utf-8', errors='replace')
    with sftp.open(env_path, 'w') as f:
        f.write(apply_patch(env_text))
    print('patched backend/.env')

    sftp.close()

    run(client, f'cd {REMOTE}/backend && npm install --omit=dev 2>/dev/null || true')
    run(client, 'pm2 restart jowabuzz')
    run(client, 'sleep 4')
    run(client, 'pm2 logs jowabuzz --lines 30 --nostream')

    code, out, _ = run(client, f'cd {REMOTE}/backend && node scripts/test_softapi_integration.js')
    print('\n=== TEST EXIT CODE ===', code)

    client.close()
    return code


if __name__ == '__main__':
    raise SystemExit(main())
