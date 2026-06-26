import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sql = """
SELECT 
  SUM(code REGEXP '^[a-f0-9]{32}$') hex,
  SUM(code NOT REGEXP '^[a-f0-9]{32}$') non_hex,
  SUM(code IS NULL OR code='') empty_code
FROM games;
SELECT p.code, COUNT(*) c,
  SUM(g.code REGEXP '^[a-f0-9]{32}$') hex
FROM games g JOIN providers p ON p.id=g.provider_id
GROUP BY p.code ORDER BY c DESC LIMIT 15;
"""
_, o, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{sql}"', timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
