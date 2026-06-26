import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT category,COUNT(*) c FROM games GROUP BY category ORDER BY c DESC LIMIT 15;\"", timeout=30)
print(o.read().decode())
# kill stuck migration if still running - migration data is already in DB
_, o, _ = c.exec_command("kill 131794 2>/dev/null; pm2 restart jowabuzz --update-env", timeout=30)
print(o.read().decode()[:300])
c.close()
