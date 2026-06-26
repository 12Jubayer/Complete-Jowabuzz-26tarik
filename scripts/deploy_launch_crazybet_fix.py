#!/usr/bin/env python3
"""Deploy launch fix: block crazybet99 launcher, use V3 only."""
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
    'backend/services/oracleGamesV3ApiClient.js',
    'backend/services/gamingGatewayService.js',
]


def patch_env(text: str) -> str:
    lines = []
    seen = set()
    patch = {'ORACLE_GAMES_V3_LAUNCH_FALLBACK': 'false'}
    for line in text.splitlines():
        key = line.split('=', 1)[0] if '=' in line and not line.strip().startswith('#') else None
        if key in patch:
            lines.append(f'{key}={patch[key]}')
            seen.add(key)
        else:
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
    print('patched ORACLE_GAMES_V3_LAUNCH_FALLBACK=false')
    sftp.close()
    _, o, _ = client.exec_command('pm2 restart jowabuzz && sleep 2 && curl -s http://127.0.0.1:3001/api/health', timeout=60)
    print(o.read().decode('utf-8', 'replace'))
    client.close()


if __name__ == '__main__':
    main()
