import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sql = """
SELECT p.code, COUNT(*) c FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.category='slot' GROUP BY p.code ORDER BY c DESC LIMIT 20;
SELECT COUNT(*) FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='JILIS' AND g.category='slot';
SELECT COUNT(*) FROM providers WHERE code='JL';
"""
_, o, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{sql}"', timeout=30000)
print(o.read().decode('utf-8','replace'))
c.close()
