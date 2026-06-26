#!/usr/bin/env python3
"""Deploy affiliate balance update to production server."""
import os, sys, tarfile, tempfile, time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
PROJECT = Path(__file__).resolve().parent.parent
REMOTE = '/www/wwwroot/jowabuzz'

SKIP = {'node_modules', '.git', 'dist', 'uploads', '__pycache__'}

def log(m):
    print(f'[{time.strftime("%H:%M:%S")}] {m}', flush=True)

def should_skip(rel):
    return any(p in SKIP for p in rel.parts)

def create_tar():
    fd, path = tempfile.mkstemp(suffix='.tar.gz')
    os.close(fd)
    n = 0
    with tarfile.open(path, 'w:gz') as tar:
        for folder in ['backend', 'frontend']:
            base = PROJECT / folder
            for item in base.rglob('*'):
                rel = item.relative_to(PROJECT)
                if should_skip(rel):
                    continue
                if item.is_file():
                    tar.add(item, arcname=str(rel).replace('\\', '/'))
                    n += 1
    log(f'Archive: {n} files, {os.path.getsize(path)/1024/1024:.1f} MB')
    return path

REMOTE_SCRIPT = r"""
set -e
REMOTE="/www/wwwroot/jowabuzz"
tar -xzf /tmp/jb-affiliate-update.tar.gz -C "$REMOTE"
cd "$REMOTE/backend" && npm install --production=false
cd "$REMOTE/frontend" && npm install && npm run build
pm2 reload jowabuzz || pm2 restart jowabuzz
sleep 4
pm2 list | grep jowabuzz
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:3001/api/health || true
echo DEPLOY_OK
"""

def main():
    tar = create_tar()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    log('Uploading...')
    sftp.put(tar, '/tmp/jb-affiliate-update.tar.gz')
    os.unlink(tar)
    sftp.close()
    log('Running remote setup...')
    _, stdout, stderr = c.exec_command(REMOTE_SCRIPT, timeout=900)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    print(out)
    if err.strip():
        print(err, file=sys.stderr)
    c.close()
    sys.exit(code)

if __name__ == '__main__':
    main()
