#!/usr/bin/env python3
"""Disconnect Oracle V3 API on production; keep callback + V2 fallback launch URL only."""
import re
import sys

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
ENV_PATH = '/www/wwwroot/jowabuzz/backend/.env'

PATCH = {
    'ORACLE_GAMES_API_VERSION': 'v2',
    'ORACLE_GAMES_CALLBACK_URL': 'https://jowabuzz.com/api/oracle/callback',
    'ORACLE_GAMES_LAUNCH_URL': 'https://crazybet99.com/getgameurl/v2',
    'ORACLE_GAMES_V3_API_BASE_URL': '',
    'ORACLE_GAMES_V3_LAUNCH_KEY': '',
    'ORACLE_GAMES_V3_DATA_KEY': '',
    'ORACLE_GAMES_V3_CATALOG_FALLBACK': 'false',
    'ORACLE_GAMES_V3_LAUNCH_FALLBACK': 'false',
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
        if key in PATCH:
            out.append(f'{key}={PATCH[key]}')
            seen.add(key)
        else:
            out.append(line)

    for key, value in PATCH.items():
        if key not in seen:
            out.append(f'{key}={value}')

    return '\n'.join(out).rstrip() + '\n'


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)

    sftp = client.open_sftp()
    with sftp.open(ENV_PATH, 'r') as f:
        current = f.read().decode('utf-8', errors='replace')
    updated = apply_patch(current)
    with sftp.open(ENV_PATH, 'w') as f:
        f.write(updated)
    sftp.close()

    print('Updated', ENV_PATH)
    for key in PATCH:
        val = PATCH[key]
        show = val if key not in ('ORACLE_GAMES_V3_LAUNCH_KEY',) else ('(cleared)' if not val else val)
        print(f'  {key}={show}')

    _, stdout, stderr = client.exec_command('pm2 restart jowabuzz && sleep 2 && curl -s http://127.0.0.1:3001/api/health', timeout=60)
    print(stdout.read().decode('utf-8', 'replace'))
    err = stderr.read().decode('utf-8', 'replace')
    if err.strip():
        print('stderr:', err)

    # Verify runtime version via node one-liner
    verify_cmd = (
        'cd /www/wwwroot/jowabuzz/backend && '
        'node --input-type=module -e "'
        "import 'dotenv/config';"
        "import { getOracleApiVersion, isOracleApiV3 } from './services/oracleGamesApiClient.js';"
        "console.log(JSON.stringify({version:getOracleApiVersion(),v3:isOracleApiV3(),callback:process.env.ORACLE_GAMES_CALLBACK_URL,launch:process.env.ORACLE_GAMES_LAUNCH_URL}));"
        '"'
    )
    _, stdout, stderr = client.exec_command(verify_cmd, timeout=60)
    print('verify:', stdout.read().decode('utf-8', 'replace').strip())
    err = stderr.read().decode('utf-8', 'replace')
    if err.strip():
        print('verify stderr:', err[:500])

    client.close()


if __name__ == '__main__':
    main()
