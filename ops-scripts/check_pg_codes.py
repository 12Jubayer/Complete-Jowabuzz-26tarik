import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sql = """
SELECT g.name, g.code, CHAR_LENGTH(g.code) len, p.code pc
FROM games g JOIN providers p ON p.id=g.provider_id
WHERE p.code='PG' AND g.name LIKE '%Fortune Tiger%' LIMIT 3;
SELECT COUNT(*) hex_slots FROM games g JOIN providers p ON p.id=g.provider_id
WHERE g.category='slot' AND g.code REGEXP '^[a-f0-9]{32}$';
SELECT COUNT(*) legacy_slots FROM games g
WHERE g.category='slot' AND g.code NOT REGEXP '^[a-f0-9]{32}$';
"""
_, o, _ = c.exec_command(f'mysql -uroot -p656940d50e847e3f jowabuzz -e "{sql}"', timeout=30000)
print(o.read().decode('utf-8','replace'))
c.close()
