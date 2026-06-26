import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT COUNT(DISTINCT p.id) slot_providers
FROM games g INNER JOIN providers p ON p.id=g.provider_id
WHERE g.is_active=1 AND g.status='active' AND p.enabled=1 AND p.status='active'
AND g.category IN ('slot','slots');
"""
_, o, _ = c.exec_command(f"mysql -uroot -p656940d50e847e3f jowabuzz -e \"{sql}\"", timeout=30)
print(o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=slot' | python3 -c \"import sys,json;d=json.load(sys.stdin);print(len(d.get('data',[])), [x['code'] for x in d.get('data',[])][:12])\"", timeout=30)
print('api', o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/games?category=slot&limit=3'", timeout=30)
print('games', o.read().decode('utf-8','replace')[:500])
c.close()
