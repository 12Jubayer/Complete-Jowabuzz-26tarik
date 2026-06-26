#!/usr/bin/env python3
"""Rename 'Bonus balance' label to 'Turnover' on profile AccountPage only."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx'

OLD = '<span className="text-sm font-semibold text-violet-700">Bonus balance</span>'
NEW = '<span className="text-sm font-semibold text-violet-700">Turnover</span>'

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')
    if OLD not in content:
        if NEW in content:
            print('ALREADY patched')
        else:
            raise SystemExit('target label not found')
    else:
        content = content.replace(OLD, NEW, 1)
        with sftp.file(FILE, 'w') as f:
            f.write(content)
        print('PATCHED label Bonus balance -> Turnover')
    sftp.close()
    _, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build')
    out = o.read().decode('utf-8', errors='replace')
    err = e.read().decode('utf-8', errors='replace')
    if 'error' in err.lower() and 'built in' not in out.lower():
        print(err[-1500:])
        raise SystemExit('build failed')
    print('build ok')
    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
