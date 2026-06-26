#!/usr/bin/env python3
"""Deploy Oracle V3 integration and patch production .env."""
import os, sys, tarfile, tempfile, time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HOST, USER, PASS = '103.168.173.101', 'root', 'Jowabuzz@12'
PROJECT = Path(__file__).resolve().parent.parent
REMOTE = '/www/wwwroot/jowabuzz'
SKIP = {'node_modules', '.git', 'dist', 'uploads', '__pycache__', 'backups'}

ENV_LINES = """
# Oracle Games API Version 3
ORACLE_GAMES_API_VERSION=v3
ORACLE_GAMES_V3_API_BASE_URL=https://oraclegames.net
ORACLE_GAMES_V3_LAUNCH_KEY=0a4c40469ec03dd868299c098da91c6b
ORACLE_GAMES_V3_DATA_KEY=
ORACLE_GAMES_V3_CATALOG_FALLBACK=v2
ORACLE_GAMES_V3_TEST_GAME_UID=4eef5090166a6889956a630321713366
ORACLE_GAMES_V3_SYNC_TEST_PROVIDER=
""".strip()

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
ENV_FILE="$REMOTE/backend/.env"
touch "$ENV_FILE"
patch_env() {
  key="$1"
  val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}
patch_env ORACLE_GAMES_API_VERSION v3
patch_env ORACLE_GAMES_V3_API_BASE_URL https://oraclegames.net
patch_env ORACLE_GAMES_V3_LAUNCH_KEY 0a4c40469ec03dd868299c098da91c6b
patch_env ORACLE_GAMES_V3_CATALOG_FALLBACK v2
patch_env ORACLE_GAMES_V3_TEST_GAME_UID 4eef5090166a6889956a630321713366
grep -q '^ORACLE_GAMES_V3_DATA_KEY=' "$ENV_FILE" || echo 'ORACLE_GAMES_V3_DATA_KEY=' >> "$ENV_FILE"
grep -q '^ORACLE_GAMES_V3_SYNC_TEST_PROVIDER=' "$ENV_FILE" || echo 'ORACLE_GAMES_V3_SYNC_TEST_PROVIDER=' >> "$ENV_FILE"
tar -xzf /tmp/jb-oracle-v3.tar.gz -C "$REMOTE"
cd "$REMOTE/backend" && npm install --production=false
cd "$REMOTE/frontend" && npm install && npm run build
pm2 reload jowabuzz || pm2 restart jowabuzz
sleep 5
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
    sftp.put(tar, '/tmp/jb-oracle-v3.tar.gz')
    os.unlink(tar)
    sftp.close()
    log('Deploying Oracle V3...')
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
