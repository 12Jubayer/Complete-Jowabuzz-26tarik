import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

sql = """
SELECT adapter_key, COUNT(*) c FROM providers GROUP BY adapter_key;
SELECT COUNT(*) hot FROM games WHERE is_hot=1;
SELECT p.code,p.adapter_key,g.name,g.code game_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.category='sports' LIMIT 10;
SELECT p.code,COUNT(*) cnt FROM games g JOIN providers p ON p.id=g.provider_id GROUP BY p.code ORDER BY cnt DESC LIMIT 8;
"""
_, o, _ = c.exec_command(f"mysql -uroot -p656940d50e847e3f jowabuzz -e \"{sql}\"", timeout=30000)
print(o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=slot' | head -c 400", timeout=30)
print('slot providers:', o.read().decode('utf-8','replace'))
c.close()
