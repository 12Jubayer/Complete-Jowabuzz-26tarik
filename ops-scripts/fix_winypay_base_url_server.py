#!/usr/bin/env python3
"""Fix WinyPay deposit redirect: use bd.winypay.com API base (returns pay_url)."""
import sys
import time
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
ENV_PATH = '/www/wwwroot/jowabuzz/backend/.env'
OLD = 'WINYPAY_BASE_URL=https://bd.gopostman.com'
NEW = 'WINYPAY_BASE_URL=https://bd.winypay.com'


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASSWORD, timeout=30)

    sftp = c.open_sftp()
    with sftp.open(ENV_PATH, 'r') as f:
        env = f.read().decode('utf-8', errors='replace')

    if NEW.split('=')[0] + '=' in env and OLD not in env:
        if 'WINYPAY_BASE_URL=https://bd.winypay.com' in env:
            print('WINYPAY_BASE_URL already bd.winypay.com')
        else:
            print('WINYPAY_BASE_URL already customized:', [l for l in env.splitlines() if l.startswith('WINYPAY_BASE_URL')])
    elif OLD in env:
        env = env.replace(OLD, NEW)
        with sftp.open(ENV_PATH, 'w') as f:
            f.write(env)
        print('Updated', OLD, '->', NEW)
    else:
        if 'WINYPAY_BASE_URL=' not in env:
            env = env.rstrip() + '\n' + NEW + '\n'
            with sftp.open(ENV_PATH, 'w') as f:
                f.write(env)
            print('Added', NEW)
        else:
            print('WARN: unexpected WINYPAY_BASE_URL line; manual check needed')
    sftp.close()

    for cmd in [
        'pm2 restart jowabuzz --update-env',
        'sleep 3',
        'curl -s http://127.0.0.1:3001/api/health',
    ]:
        print('$', cmd)
        _, o, e = c.exec_command(cmd, timeout=60)
        out = o.read().decode('utf-8', errors='replace')
        err = e.read().decode('utf-8', errors='replace')
        if out.strip():
            print(out.rstrip())
        if err.strip():
            print(err.rstrip())

    # smoke test via node config reader
    test = r'''
import dotenv from 'dotenv';
dotenv.config();
import { getWinypayConfig } from './services/winypayService.js';
const c = getWinypayConfig();
console.log('depositEndpoint:', c.depositEndpoint);
'''
    sftp = c.open_sftp()
    with sftp.open('/www/wwwroot/jowabuzz/backend/_wp_base_fix.mjs', 'w') as f:
        f.write(test)
    sftp.close()
    _, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node _wp_base_fix.mjs', timeout=30)
    print(o.read().decode('utf-8', errors='replace'))
    c.exec_command('rm -f /www/wwwroot/jowabuzz/backend/_wp_base_fix.mjs')
    c.close()
    print('DONE — deposit should redirect to WinyPay again')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
