import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT code,name,enabled,status,adapter_key FROM providers WHERE code LIKE '%JIL%' OR name LIKE '%jili%';
SELECT p.code, g.category, COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id 
WHERE p.code LIKE '%JIL%' OR p.code='JL' GROUP BY p.code, g.category;
SELECT COUNT(*) FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='JL' AND g.category IN ('slot','slots') AND g.is_active=1;
"""
_, o, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{sql}"', timeout=30000)
print('DB:', o.read().decode('utf-8','replace'))

for url in [
    "http://127.0.0.1:3001/api/site/games?category=slot&provider=JL&limit=5",
    "http://127.0.0.1:3001/api/site/games?category=slots&provider=JL&limit=5",
    "http://127.0.0.1:3001/api/site/games?category=slot&provider=JILI&limit=5",
    "http://127.0.0.1:3001/api/site/providers?category=slot",
]:
    _, o, _ = c.exec_command(f"curl -s '{url}' | head -c 500", timeout=30)
    print('URL', url)
    print(o.read().decode('utf-8','replace'))
    print('---')
c.close()
