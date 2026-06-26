#!/usr/bin/env python3
"""Full Jowabuzz deployment to 103.165.10.242"""
import os
import sys
import tarfile
import tempfile
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "103.165.10.242"
USER = "root"
PASS = "Jowabuzz@12"
OLD_HOST = "85.120.253.100"
OLD_PASS = "2uRXV3zsX7HsKut1XP"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
REMOTE_ROOT = "/www/wwwroot/jowabuzz"
REMOTE_TAR = "/tmp/jowabuzz-full-deploy.tar.gz"

ENV_CONTENT = """PORT=3001
NODE_ENV=production
JWT_SECRET=b6e042593cf89bcd9967d135c9285d4f1712ca7e5f586e402bfbf433f3b30157
JWT_EXPIRES_IN=8h
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=656940d50e847e3f
DB_NAME=jowabuzz
ADMIN_EMAIL=admin@jowabuzz.com
ADMIN_PASSWORD=JowaBuzz@2026!
SITE_URL=https://jowabuzz.com
MAIL_MODE=demo
ORACLE_GAMES_API_BASE_URL=https://api.oraclegames.live
ORACLE_GAMES_LAUNCH_URL=https://crazybet99.com/getgameurl/v2
ORACLE_GAMES_API_KEY=918d7148-981d-4f63-8275-2abdd0de27a3
ORACLE_GAMES_DST_GAME_KEY=0a4c40469ec03dd868299c098da91c6b
ORACLE_GAMES_API_MODE=production
ORACLE_GAMES_CALLBACK_URL=https://jowabuzz.com/api/oracle/callback
DST_GAME_KEY=0a4c40469ec03dd868299c098da91c6b
ORACLE_GAMES_WEBHOOK_SECRET=0a4c40469ec03dd868299c098da91c6b
ORACLE_GAMES_DST_KEY=0a4c40469ec03dd868299c098da91c6b
ORACLE_PLAYER_USERNAME_PREFIX=nfc
ORACLE_GAMES_OPERATOR_ID=dsgaming
ORACLE_GAMES_API_VERSION=v3
ORACLE_GAMES_V3_API_BASE_URL=https://oraclegames.net
ORACLE_GAMES_V3_LAUNCH_KEY=0a4c40469ec03dd868299c098da91c6b
ORACLE_GAMES_V3_DATA_KEY=
ORACLE_GAMES_V3_CATALOG_FALLBACK=v2
ORACLE_GAMES_V3_TEST_GAME_UID=4eef5090166a6889956a630321713366
ORACLE_GAMES_V3_SYNC_TEST_PROVIDER=
GAMING_LIVE_API_ENABLED=true
AFFILIATE_PANEL_URL=https://jowabuzzaffiliate.com
MOVECASH_PUBLIC_BASE_URL=https://jowabuzz.shop
"""

SKIP_DIRS = {"node_modules", ".git", "dist", "uploads", "__pycache__"}
SKIP_SUFFIX = {".tar.gz", ".zip"}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    return c


def run(client, cmd, timeout=900, check=True):
    log(f">>> {cmd[:120]}...")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip()[-4000:])
    if err.strip():
        print(err.rstrip()[-2000:], file=sys.stderr)
    if check and code != 0:
        raise RuntimeError(f"Failed ({code}): {cmd[:80]}")
    return code, out, err


def should_skip(rel: Path) -> bool:
    parts = rel.parts
    if any(p in SKIP_DIRS for p in parts):
        return True
    if rel.suffix in SKIP_SUFFIX:
        return True
    if rel.name.startswith(".") and rel.name not in {".env.example"}:
        if rel.name != ".env.example":
            return rel.name.startswith(".")
    return False


def create_tar():
    fd, path = tempfile.mkstemp(suffix=".tar.gz")
    os.close(fd)
    log(f"Creating archive at {path}")
    count = 0
    with tarfile.open(path, "w:gz") as tar:
        for folder in ["backend", "frontend", "uploadfile"]:
            base = PROJECT_ROOT / folder
            if not base.exists():
                continue
            for item in base.rglob("*"):
                rel = item.relative_to(PROJECT_ROOT)
                if should_skip(rel):
                    continue
                if item.is_file():
                    tar.add(item, arcname=str(rel).replace("\\", "/"))
                    count += 1
    size_mb = os.path.getsize(path) / (1024 * 1024)
    log(f"Archive ready: {count} files, {size_mb:.1f} MB")
    return path


REMOTE_SETUP = r"""
set -e
export DEBIAN_FRONTEND=noninteractive

DB_PASS="656940d50e847e3f"
DB_NAME="jowabuzz"
OLD_HOST="85.120.253.100"
OLD_PASS="2uRXV3zsX7HsKut1XP"
REMOTE_ROOT="/www/wwwroot/jowabuzz"
REMOTE_TAR="/tmp/jowabuzz-full-deploy.tar.gz"

echo "=== Extract project ==="
mkdir -p "$REMOTE_ROOT"
if [ -d "$REMOTE_ROOT/backend/uploads" ]; then
  mv "$REMOTE_ROOT/backend/uploads" /tmp/jowabuzz-uploads-backup
fi
tar -xzf "$REMOTE_TAR" -C "$REMOTE_ROOT"
rm -f "$REMOTE_TAR"
if [ -d /tmp/jowabuzz-uploads-backup ]; then
  mkdir -p "$REMOTE_ROOT/backend/uploads"
  cp -a /tmp/jowabuzz-uploads-backup/. "$REMOTE_ROOT/backend/uploads/" 2>/dev/null || true
  rm -rf /tmp/jowabuzz-uploads-backup
fi

echo "=== Write .env ==="
mkdir -p "$REMOTE_ROOT/backend"
cp /tmp/jowabuzz-backend.env "$REMOTE_ROOT/backend/.env"
chmod 600 "$REMOTE_ROOT/backend/.env"
rm -f /tmp/jowabuzz-backend.env

echo "=== Database import ==="
mysql -uroot -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
TABLES=$(mysql -uroot -p"$DB_PASS" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';")
if [ "$TABLES" -lt 5 ]; then
  echo "Importing database from old server..."
  apt-get install -y sshpass >/dev/null 2>&1 || true
  sshpass -p "$OLD_PASS" ssh -o StrictHostKeyChecking=no root@${OLD_HOST} \
    "mysqldump -uroot -p656940d50e847e3f --single-transaction --routines --triggers jowabuzz" \
    | mysql -uroot -p"$DB_PASS" "$DB_NAME"
  echo "Database imported."
else
  echo "Database already has $TABLES tables - skipping import."
fi

echo "=== Sync uploads from old server ==="
mkdir -p "$REMOTE_ROOT/backend/uploads"
apt-get install -y sshpass rsync >/dev/null 2>&1 || true
sshpass -p "$OLD_PASS" rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  root@${OLD_HOST}:/www/wwwroot/jowabuzz/backend/uploads/ \
  "$REMOTE_ROOT/backend/uploads/" || echo "Upload sync warning (continuing)"

echo "=== npm install backend ==="
cd "$REMOTE_ROOT/backend" && npm install --production=false

echo "=== npm install + build frontend ==="
cd "$REMOTE_ROOT/frontend" && npm install && npm run build

echo "=== PM2 ==="
cd "$REMOTE_ROOT/backend"
pm2 delete jowabuzz 2>/dev/null || true
pm2 start server.js --name jowabuzz --cwd "$REMOTE_ROOT/backend"
pm2 save

echo "=== Nginx ==="
mkdir -p /var/www/certbot /www/wwwlogs

cat > /etc/nginx/sites-available/jowabuzz.com << 'NGINX_MAIN'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name jowabuzz.com www.jowabuzz.com _;

    access_log /www/wwwlogs/jowabuzz.com.log;
    error_log /www/wwwlogs/jowabuzz.com.error.log;

    location = /robots.txt {
        alias /www/wwwroot/jowabuzz/frontend/public/robots-main.txt;
        default_type text/plain;
        access_log off;
    }
    location = /sitemap.xml {
        alias /www/wwwroot/jowabuzz/frontend/public/sitemap.xml;
        default_type application/xml;
        access_log off;
    }
    location = /movecash-manifest.webmanifest { return 404; }
    location = /movecash-sw.js { return 404; }
    location = /agent-app { return 302 http://jowabuzz.shop/agent-app$is_args$args; }
    location = /jbcash-agent { return 302 http://jowabuzz.shop/agent-app$is_args$args; }
    location ~ ^/agent/(login|dashboard|transactions)(/|$) { return 302 http://jowabuzz.shop$request_uri; }
    location = /agent { return 302 /; }
    location ~ ^/movecash(/|$) { return 302 /; }
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }
}
NGINX_MAIN

cat > /etc/nginx/sites-available/jowabuzz.shop << 'NGINX_SHOP'
server {
    listen 80;
    server_name jowabuzz.shop www.jowabuzz.shop;

    access_log /www/wwwlogs/jowabuzz.shop.log;
    error_log /www/wwwlogs/jowabuzz.shop.error.log;

    location = / { return 302 /agent; }
    location = /robots.txt {
        alias /www/wwwroot/jowabuzz/frontend/public/robots-agent-shop.txt;
        default_type text/plain;
        access_log off;
    }
    location = /sitemap-agent.xml {
        alias /www/wwwroot/jowabuzz/frontend/public/sitemap-agent.xml;
        default_type application/xml;
        access_log off;
    }
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }
}
NGINX_SHOP

cat > /etc/nginx/sites-available/jowabuzzaffiliate.com << 'NGINX_AFF'
server {
    listen 80;
    server_name jowabuzzaffiliate.com www.jowabuzzaffiliate.com;

    access_log /www/wwwlogs/jowabuzzaffiliate.com.log;
    error_log /www/wwwlogs/jowabuzzaffiliate.com.error.log;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50m;
    }
}
NGINX_AFF

ln -sf /etc/nginx/sites-available/jowabuzz.com /etc/nginx/sites-enabled/jowabuzz.com
ln -sf /etc/nginx/sites-available/jowabuzz.shop /etc/nginx/sites-enabled/jowabuzz.shop
ln -sf /etc/nginx/sites-available/jowabuzzaffiliate.com /etc/nginx/sites-enabled/jowabuzzaffiliate.com
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Health checks ==="
sleep 4
pm2 list
curl -s -o /dev/null -w "Node: %{http_code}\n" http://127.0.0.1:3001/ || true
curl -s -o /dev/null -w "Nginx: %{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/ || true
mysql -uroot -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) AS users FROM users;" 2>/dev/null || true
echo "=== DEPLOY COMPLETE ==="
"""


def main():
    log("Starting full deployment...")
    tar_path = create_tar()

    client = connect()
    log(f"Connected to {HOST}")
    try:
        sftp = client.open_sftp()
        log(f"Uploading to {REMOTE_TAR}...")
        last_pct = [-1]
        def progress(x, y):
            pct = int(100 * x / y) if y else 0
            if pct >= last_pct[0] + 10:
                last_pct[0] = pct
                log(f"  upload {pct}%")
        sftp.put(tar_path, REMOTE_TAR, callback=progress)
        log("Uploading .env to /tmp/jowabuzz-backend.env...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False, newline='\n') as ef:
            ef.write(ENV_CONTENT)
            env_tmp = ef.name
        sftp.put(env_tmp, "/tmp/jowabuzz-backend.env")
        os.unlink(env_tmp)
        sftp.close()
        os.unlink(tar_path)
        log("Upload done. Running remote setup (may take 5-10 min)...")
        run(client, f"bash -s << 'DEPLOYSCRIPT'\n{REMOTE_SETUP}\nDEPLOYSCRIPT", timeout=1800)
    finally:
        client.close()
    log("All done!")


if __name__ == "__main__":
    main()
