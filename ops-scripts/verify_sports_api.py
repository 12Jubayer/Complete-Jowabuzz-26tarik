import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

for cat in ['sports', 'hot', 'slot']:
    _, o, _ = c.exec_command(f"curl -s 'http://127.0.0.1:3001/api/site/providers?category={cat}' | head -c 700", timeout=30)
    print(cat, o.read().decode('utf-8','replace')[:700])
    print('---')

_, o, _ = c.exec_command("ps aux | grep migrate_oracle | grep -v grep || echo DONE_PROCESS", timeout=30)
print(o.read().decode('utf-8','replace'))
c.close()
