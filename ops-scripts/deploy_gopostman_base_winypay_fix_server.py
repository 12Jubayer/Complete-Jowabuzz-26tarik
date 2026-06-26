#!/usr/bin/env python3
"""Restore gopostman base URL + deploy dual-host WinyPay deposit fix."""
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
LOCAL_SERVICE = Path(__file__).resolve().parent.parent / 'JB-main(1)' / 'JB-main' / 'backend' / 'services' / 'winypayService.js'
ENV_PATH = f'{REMOTE}/backend/.env'
REMOTE_SERVICE = f'{REMOTE}/backend/services/winypayService.js'


def patch_env(env: str) -> str:
    lines = []
    seen_base = False
    for line in env.splitlines():
        if line.startswith('WINYPAY_BASE_URL='):
            lines.append('WINYPAY_BASE_URL=https://bd.gopostman.com')
            seen_base = True
        else:
            lines.append(line)
    if not seen_base:
        lines.append('WINYPAY_BASE_URL=https://bd.gopostman.com')
    return '\n'.join(lines).rstrip() + '\n'


def main():
    if not LOCAL_SERVICE.exists():
        raise SystemExit(f'Missing local file: {LOCAL_SERVICE}')

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)
    sftp = c.open_sftp()

    sftp.put(str(LOCAL_SERVICE), REMOTE_SERVICE)
    print('uploaded winypayService.js')

    with sftp.open(ENV_PATH, 'r') as f:
        env = f.read().decode('utf-8', errors='replace')
    patched = patch_env(env)
    with sftp.open(ENV_PATH, 'w') as f:
        f.write(patched)
    print('WINYPAY_BASE_URL=https://bd.gopostman.com')

    verify = r'''
import dotenv from 'dotenv';
dotenv.config();
import { getWinypayConfig } from './services/winypayService.js';
const c = getWinypayConfig();
console.log(JSON.stringify({
  baseUrl: c.baseUrl,
  depositApiBaseUrl: c.depositApiBaseUrl,
  depositEndpoint: c.depositEndpoint,
  withdrawEndpoint: c.withdrawEndpoint,
}));
'''
    with sftp.open(f'{REMOTE}/backend/_wp_dual.mjs', 'w') as f:
        f.write(verify)
    sftp.close()

    for cmd in [
        f'cd {REMOTE}/backend && node _wp_dual.mjs',
        'pm2 restart jowabuzz --update-env',
        'sleep 3',
        'curl -s http://127.0.0.1:3001/api/health',
        f'rm -f {REMOTE}/backend/_wp_dual.mjs',
    ]:
        print('$', cmd)
        _, o, e = c.exec_command(cmd, timeout=60)
        out = o.read().decode('utf-8', errors='replace')
        err = e.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out.rstrip())
        if err.strip():
            print(err.rstrip())

    c.close()
    print('DONE')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
