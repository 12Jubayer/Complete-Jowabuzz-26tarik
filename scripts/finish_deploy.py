import paramiko, sys, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SCRIPT = r"""
set -e
REMOTE_ROOT="/www/wwwroot/jowabuzz"
OLD_HOST="85.120.253.100"
OLD_PASS="2uRXV3zsX7HsKut1XP"
DB_PASS="656940d50e847e3f"
DB_NAME="jowabuzz"

echo "=== Sync uploads ==="
mkdir -p "$REMOTE_ROOT/backend/uploads"
apt-get install -y sshpass rsync >/dev/null 2>&1 || true
sshpass -p "$OLD_PASS" rsync -avz -e "ssh -o StrictHostKeyChecking=no" \
  root@${OLD_HOST}:/www/wwwroot/jowabuzz/backend/uploads/ \
  "$REMOTE_ROOT/backend/uploads/"
echo "Uploads size: $(du -sh $REMOTE_ROOT/backend/uploads | cut -f1)"

echo "=== npm backend ==="
cd "$REMOTE_ROOT/backend"
npm install
echo "Backend deps OK"

echo "=== npm frontend + build ==="
cd "$REMOTE_ROOT/frontend"
npm install
npm run build
test -f dist/index.html && echo "Frontend build OK"

echo "=== PM2 start ==="
cd "$REMOTE_ROOT/backend"
pm2 delete jowabuzz 2>/dev/null || true
pm2 start server.js --name jowabuzz --cwd "$REMOTE_ROOT/backend"
pm2 save

echo "=== Nginx config ==="
mkdir -p /var/www/certbot /www/wwwlogs

cat > /etc/nginx/sites-available/jowabuzz.com << 'NGX'
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
NGX

cat > /etc/nginx/sites-available/jowabuzz.shop << 'NGX'
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
NGX

cat > /etc/nginx/sites-available/jowabuzzaffiliate.com << 'NGX'
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
NGX

ln -sf /etc/nginx/sites-available/jowabuzz.com /etc/nginx/sites-enabled/jowabuzz.com
ln -sf /etc/nginx/sites-available/jowabuzz.shop /etc/nginx/sites-enabled/jowabuzz.shop
ln -sf /etc/nginx/sites-available/jowabuzzaffiliate.com /etc/nginx/sites-enabled/jowabuzzaffiliate.com
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

sleep 5
echo "=== FINAL STATUS ==="
pm2 list
curl -s -o /dev/null -w "Node direct: %{http_code}\n" http://127.0.0.1:3001/
curl -s -o /dev/null -w "Nginx proxy: %{http_code}\n" -H "Host: jowabuzz.com" http://127.0.0.1/
curl -s -o /dev/null -w "IP direct: %{http_code}\n" http://103.165.10.242/
mysql -uroot -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) AS users FROM users;"
echo "=== FINISH COMPLETE ==="
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
print('Running finish deploy (npm + pm2 + nginx)...')
chan = c.get_transport().open_session()
chan.settimeout(1800)
chan.exec_command(f"bash -s << 'EOF'\n{SCRIPT}\nEOF")
buf = b''
while True:
    if chan.recv_ready():
        data = chan.recv(8192)
        buf += data
        print(data.decode('utf-8', errors='replace'), end='', flush=True)
    if chan.recv_stderr_ready():
        print(chan.recv_stderr(8192).decode('utf-8', errors='replace'), end='', flush=True)
    if chan.exit_status_ready():
        while chan.recv_ready():
            print(chan.recv(8192).decode('utf-8', errors='replace'), end='', flush=True)
        break
    time.sleep(0.3)
code = chan.recv_exit_status()
c.close()
print(f'\nExit code: {code}')
sys.exit(code)
