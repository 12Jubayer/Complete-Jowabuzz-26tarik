#!/usr/bin/env python3
"""Deploy game launch fix + sync Oracle V3 games catalog."""
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
ROOT = Path(__file__).resolve().parent.parent

FILES = [
    'backend/services/oracleGamingApiService.js',
    'backend/services/oracleGamesApiClient.js',
    'backend/services/gamingGatewayService.js',
]


def patch_env(text: str) -> str:
    patch = {'ORACLE_GAMES_V3_LAUNCH_FALLBACK': 'v2'}
    lines = []
    seen = set()
    for line in text.splitlines():
        if '=' in line and not line.strip().startswith('#'):
            key = line.split('=', 1)[0]
            if key in patch:
                lines.append(f'{key}={patch[key]}')
                seen.add(key)
                continue
        lines.append(line)
    for key, val in patch.items():
        if key not in seen:
            lines.append(f'{key}={val}')
    return '\n'.join(lines).rstrip() + '\n'


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = client.open_sftp()
    for rel in FILES:
        sftp.put(str(ROOT / rel), f'{REMOTE}/{rel}')
        print('uploaded', rel)
    env_path = f'{REMOTE}/backend/.env'
    with sftp.open(env_path, 'r') as f:
        env_text = f.read().decode('utf-8', errors='replace')
    with sftp.open(env_path, 'w') as f:
        f.write(patch_env(env_text))
    sftp.close()

    sync_cmd = (
        f'cd {REMOTE}/backend && '
        'node --input-type=module --eval "'
        "import 'dotenv/config';"
        "import { syncGamesFromOracle } from './services/gameCatalogService.js';"
        "const r = await syncGamesFromOracle();"
        "console.log(JSON.stringify(r));"
        'process.exit(0);"'
    )
    print('syncing games from Oracle...')
    _, o, e = client.exec_command(sync_cmd, timeout=600000)
    print(o.read().decode('utf-8', 'replace'))
    err = e.read().decode('utf-8', 'replace')
    if err.strip():
        print('sync stderr:', err[:800])

    _, o, _ = client.exec_command('pm2 restart jowabuzz && sleep 2 && curl -s http://127.0.0.1:3001/api/health', timeout=60)
    print(o.read().decode('utf-8', 'replace'))
    client.close()


if __name__ == '__main__':
    main()
