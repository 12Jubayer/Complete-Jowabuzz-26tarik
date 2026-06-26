#!/usr/bin/env python3
"""Safe production site recovery — restart services only, no code/db changes."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

REMOTE = r'''bash -s <<'EOS'
set -e
echo "=== BEFORE ==="
pm2 list | grep jowabuzz || echo "jowabuzz not in pm2"
systemctl is-active nginx || true
curl -sS -m 5 -o /dev/null -w "api:%{http_code}\n" http://127.0.0.1:3001/api/health || echo api:down
curl -sS -m 5 -o /dev/null -w "nginx_http:%{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/ || echo nginx_http:down

echo
echo "=== RESTART PM2 (jowabuzz) ==="
cd /www/wwwroot/jowabuzz/backend
pm2 reload jowabuzz 2>/dev/null || pm2 restart jowabuzz 2>/dev/null || pm2 start server.js --name jowabuzz
pm2 save
sleep 3

echo
echo "=== RESTART NGINX ==="
nginx -t
systemctl restart nginx

echo
echo "=== AFTER ==="
pm2 list | grep jowabuzz
curl -sS -m 8 -o /dev/null -w "api:%{http_code}\n" http://127.0.0.1:3001/api/health
curl -sS -m 8 -o /dev/null -w "nginx_http:%{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/
curl -sS -m 8 -o /dev/null -w "https_public:%{http_code}\n" https://jowabuzz.com/ || echo https_public:fail
echo RESTORE_DONE
EOS'''

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print('Connecting SSH...')
    c.connect(HOST, 22, USER, PASS, timeout=90, banner_timeout=120)
    _, stdout, stderr = c.exec_command(REMOTE, timeout=180)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err.strip():
        print('STDERR:', err)
    code = stdout.channel.recv_exit_status()
    c.close()
    sys.exit(code)

if __name__ == '__main__':
    main()
