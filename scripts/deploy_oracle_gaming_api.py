#!/usr/bin/env python3
"""Deploy Oracle Gaming API integration and run smoke tests."""
import json
import re
import sys

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'

FILES = [
    'backend/services/oracleGamingApiService.js',
    'backend/services/oracleGamesV3ApiClient.js',
    'backend/services/oracleGamesApiClient.js',
    'backend/.env.example',
]

ENV_PATCH = {
    'ORACLE_GAMES_API_VERSION': 'v3',
    'ORACLE_GAMES_V3_API_BASE_URL': 'https://oraclegames.net',
    'ORACLE_GAMING_ORACHAL_KEY': '4895677890656568745',
    'ORACLE_GAMING_DATA_KEY': '1189baca156e1bbbecc3b26651a63565',
    'ORACLE_GAMES_V3_LAUNCH_KEY': '4895677890656568745',
    'ORACLE_GAMES_V3_DATA_KEY': '1189baca156e1bbbecc3b26651a63565',
    'ORACLE_GAMES_CALLBACK_URL': 'https://jowabuzz.com/api/oracle/callback',
    'ORACLE_GAMES_V3_CATALOG_FALLBACK': 'v2',
    'ORACLE_GAMES_V3_LAUNCH_FALLBACK': 'v2',
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


def main():
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = client.open_sftp()

    for rel in FILES:
        sftp.put(str(root / rel), f'{REMOTE}/{rel}')
        print('uploaded', rel)

    env_path = f'{REMOTE}/backend/.env'
    with sftp.open(env_path, 'r') as f:
        env_text = f.read().decode('utf-8', errors='replace')
    with sftp.open(env_path, 'w') as f:
        f.write(apply_patch(env_text))
    print('patched backend/.env')

    sftp.close()

    _, stdout, _ = client.exec_command('pm2 restart jowabuzz && sleep 3', timeout=60)
    print(stdout.read().decode('utf-8', 'replace'))

    test_script = r'''
import {
  getAllProviders,
  getProviderByCode,
  getGames,
  launchGame,
  testConnection,
  resolveOracleGamingCredentials,
} from './services/oracleGamingApiService.js';

const creds = resolveOracleGamingCredentials();
const report = { callbackUrl: process.env.ORACLE_GAMES_CALLBACK_URL, tests: {} };

try {
  const providers = await getAllProviders();
  report.tests.providers = { ok: providers.length > 0, count: providers.length, sample: providers.slice(0, 3) };
} catch (e) {
  report.tests.providers = { ok: false, error: e.message };
}

const providerCode = report.tests.providers?.sample?.[0]?.code || 'JILI';
try {
  const byCode = await getProviderByCode(creds, providerCode);
  report.tests.providerByCode = { ok: true, provider: byCode.provider?.code, gameCount: byCode.games?.length || 0 };
} catch (e) {
  report.tests.providerByCode = { ok: false, provider: providerCode, error: e.message };
}

const testUid = process.env.ORACLE_GAMES_V3_TEST_GAME_UID || '4eef5090166a6889956a630321713366';
try {
  const games = await getGames(creds, [testUid]);
  report.tests.games = { ok: games.length > 0, count: games.length, sample: games[0]?.name || null };
} catch (e) {
  report.tests.games = { ok: false, error: e.message };
}

try {
  const launch = await launchGame(creds, { username: 'abcdefghij', game_uid: testUid, amount: '1' });
  report.tests.launch = { ok: Boolean(launch.success && launch.gameUrl), hasUrl: Boolean(launch.gameUrl), message: launch.message || null };
} catch (e) {
  report.tests.launch = { ok: false, error: e.message };
}

try {
  const conn = await testConnection(creds);
  report.tests.connection = { ok: conn.success, message: conn.message };
} catch (e) {
  report.tests.connection = { ok: false, error: e.message };
}

console.log(JSON.stringify(report, null, 2));
'''

    cmd = (
        f'cd {REMOTE}/backend && '
        f"cat > /tmp/test-oracle.mjs <<'EOF'\n{test_script}\nEOF\n"
        'node --input-type=module /tmp/test-oracle.mjs'
    )
    _, stdout, stderr = client.exec_command(cmd, timeout=120000)
    out = stdout.read().decode('utf-8', 'replace')
    err = stderr.read().decode('utf-8', 'replace')
    if err.strip():
        print('stderr:', err[:1000])
    print(out)

    _, stdout, _ = client.exec_command('curl -s http://127.0.0.1:3001/api/oracle/callback/info', timeout=30)
    print('callback:', stdout.read().decode('utf-8', 'replace').strip())

    client.close()


if __name__ == '__main__':
    main()
