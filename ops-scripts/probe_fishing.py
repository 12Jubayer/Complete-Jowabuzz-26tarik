import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT category, COUNT(*) c FROM games WHERE is_active=1 GROUP BY category ORDER BY c DESC;
SELECT COUNT(*) fish_db FROM games WHERE category='fish' AND is_active=1;
SELECT COUNT(*) fishing_db FROM games WHERE category='fishing' AND is_active=1;
"""
_, o, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{sql}"', timeout=30000)
print('DB:', o.read().decode('utf-8','replace'))

for url in [
    "http://127.0.0.1:3001/api/site/games?category=fishing&limit=3",
    "http://127.0.0.1:3001/api/site/games?category=fish&limit=3",
    "http://127.0.0.1:3001/api/site/providers?category=fishing",
    "http://127.0.0.1:3001/api/site/providers?category=fish",
]:
    _, o, _ = c.exec_command(f"curl -s '{url}' | head -c 400", timeout=30)
    print('URL', url)
    print(o.read().decode('utf-8','replace'))
    print('---')
c.close()
