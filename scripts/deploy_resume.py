#!/usr/bin/env python3
import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = "103.165.10.242", "root", "Jowabuzz@12"

RESUME = r"""
set -e
DB_PASS="656940d50e847e3f"
DB_NAME="jowabuzz"
OLD_HOST="85.120.253.100"
OLD_PASS="2uRXV3zsX7HsKut1XP"
REMOTE_ROOT="/www/wwwroot/jowabuzz"

echo "=== Fix database (drop + reimport) ==="
mysql -uroot -p"$DB_PASS" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
apt-get install -y sshpass >/dev/null 2>&1 || true
sshpass -p "$OLD_PASS" ssh -o StrictHostKeyChecking=no root@${OLD_HOST} \
  "mysqldump -uroot -p656940d50e847e3f --single-transaction --skip-lock-tables --routines --triggers --set-gtid-purged=OFF jowabuzz 2>/dev/null" \
  | mysql -uroot -p"$DB_PASS" "$DB_NAME"
echo "Tables:" $(mysql -uroot -p"$DB_PASS" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';")

echo "=== Sync uploads ==="
mkdir -p "$REMOTE_ROOT/backend/uploads"
apt-get install -y rsync >/dev/null 2>&1 || true
sshpass -p "$OLD_PASS" rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  root@${OLD_HOST}:/www/wwwroot/jowabuzz/backend/uploads/ \
  "$REMOTE_ROOT/backend/uploads/"

echo "=== npm backend ==="
cd "$REMOTE_ROOT/backend" && npm install

echo "=== npm frontend + build ==="
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
    location = /robots.txt { alias /www/wwwroot/jowabuzz/frontend/public/robots-main.txt; default_type text/plain; access_log off; }
    location = /sitemap.xml { alias /www/wwwroot/jowabuzz/frontend/public/sitemap.xml; default_type application/xml; access_log off; }
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
    location = /robots.txt { alias /www/wwwroot/jowabuzz/frontend/public/robots-agent-shop.txt; default_type text/plain; access_log off; }
    location = /sitemap-agent.xml { alias /www/wwwroot/jowabuzz/frontend/public/sitemap-agent.xml; default_type application/xml; access_log off; }
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

sleep 4
echo "=== Health ==="
pm2 list
curl -s -o /dev/null -w "Node: %{http_code}\n" http://127.0.0.1:3001/
curl -s -o /dev/null -w "Nginx: %{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/
mysql -uroot -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) AS users FROM users;"
echo "=== RESUME COMPLETE ==="
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
print("Running resume setup...")
_, stdout, stderr = c.exec_command(f"bash -s << 'SCRIPT'\n{RESUME}\nSCRIPT", timeout=1800)
while True:
    if stdout.channel.recv_ready():
        print(stdout.channel.recv(4096).decode('utf-8', errors='replace'), end='', flush=True)
    if stderr.channel.recv_stderr_ready():
        print(stderr.channel.recv_stderr(4096).decode('utf-8', errors='replace'), end='', flush=True)
    if stdout.channel.exit_status_ready():
        break
    time.sleep(1)
code = stdout.channel.recv_exit_status()
rest = stdout.read().decode('utf-8', errors='replace')
if rest: print(rest)
err = stderr.read().decode('utf-8', errors='replace')
if err: print(err, file=sys.stderr)
c.close()
sys.exit(code)
